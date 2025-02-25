import weaviate
import json
from typing import List, Dict, Optional, Any
from .config import settings


class VectorStore:
    def __init__(self):
        self.client = weaviate.Client(settings.WEAVIATE_URL)

    def create_collection(self, collection_name: str, description: str = ""):
        """Create a new collection (class) in Weaviate."""
        class_obj = {
            "class": collection_name,
            "description": description,
            "vectorizer": "none",
            "properties": [
                {
                    "dataType": ["text"],
                    "name": "text",
                    "description": "The text content",
                },
                {
                    "dataType": ["text"],
                    "name": "metadata",
                    "description": "Document metadata (stored as JSON string)",
                },
            ],
        }

        try:
            self.client.schema.create_class(class_obj)
            return True
        except Exception as e:
            if "already exists" in str(e):
                return False
            raise e

    def delete_collection(self, collection_name: str):
        """Delete a collection and all its data."""
        try:
            self.client.schema.delete_class(collection_name)
            return True
        except Exception:
            return False

    def _check_duplicate(self, collection_name: str, text: str, metadata: Dict) -> bool:
        """Check if a document with the same content already exists."""
        try:
            query = (
                self.client.query.get(collection_name, ["text", "metadata"])
                .with_where(
                    {
                        "operator": "And",
                        "operands": [
                            {"path": ["text"], "operator": "Equal", "valueText": text},
                            {
                                "path": ["metadata", "filename"],
                                "operator": "Equal",
                                "valueString": metadata.get("filename", ""),
                            },
                        ],
                    }
                )
                .with_limit(1)
            )

            result = query.do()
            if result and "data" in result:
                docs = result["data"]["Get"][collection_name]
                return len(docs) > 0
            return False
        except Exception as e:
            print(f"Error checking for duplicates: {str(e)}")
            return False

    def add_documents(
        self, collection_name: str, documents: List[Dict], vectors: List[List[float]]
    ) -> List[str]:
        """Add documents with their vectors to a collection."""
        added_ids = []
        batch_size = 50  # Reduced batch size

        # Process in smaller batches
        for i in range(0, len(documents), batch_size):
            batch_docs = documents[i : i + batch_size]
            batch_vectors = vectors[i : i + batch_size]

            print(
                f"Processing batch {i // batch_size + 1} of {(len(documents) + batch_size - 1) // batch_size}"
            )

            with self.client.batch as batch:
                batch.batch_size = batch_size
                for doc, vector in zip(batch_docs, batch_vectors):
                    try:
                        # Check for duplicates before adding
                        if self._check_duplicate(
                            collection_name, doc["text"], doc["metadata"]
                        ):
                            print(
                                f"Skipping duplicate document: {doc['metadata'].get('filename', 'unknown')}"
                            )
                            continue

                        properties = {
                            "text": doc["text"],
                            "metadata": json.dumps(doc["metadata"]),
                        }

                        # Add document and collect its ID
                        doc_id = batch.add_data_object(
                            data_object=properties,
                            class_name=collection_name,
                            vector=vector,
                        )
                        added_ids.append(doc_id)
                    except Exception as e:
                        print(f"Error adding document to batch: {str(e)}")
                        continue

        return added_ids

    def search(
        self,
        collection_name: str,
        query_vector: List[float],
        filters: Optional[Dict] = None,
        limit: int = 5,
    ) -> List[Dict]:
        """Search for similar documents in a single collection."""
        return self._search_collection(collection_name, query_vector, filters, limit)

    def _search_collection(
        self,
        collection_name: str,
        query_vector: List[float],
        filters: Optional[Dict] = None,
        limit: int = 5,
    ) -> List[Dict]:
        """Internal method to search a single collection."""
        try:
            # First check if collection exists
            schema = self.client.schema.get(collection_name)
            if not schema:
                print(f"Collection {collection_name} does not exist")
                return []

            # Check if collection has any documents
            doc_count = (
                self.client.query.aggregate(collection_name).with_meta_count().do()
            )
            if (
                not doc_count.get("data", {})
                .get("Aggregate", {})
                .get(collection_name, [])
            ):
                print(f"Collection {collection_name} is empty")
                return []

            # Build search query
            query = (
                self.client.query.get(
                    collection_name, ["text", "metadata", "_additional {certainty}"]
                )
                .with_near_vector({"vector": query_vector})
                .with_limit(limit)
            )

            if filters:
                print(f"Applying filters: {json.dumps(filters, indent=2)}")
                query = query.with_where(filters)

            # Execute search
            result = query.do()
            if not result:
                print("Search query returned None")
                return []

            if "data" not in result:
                print(f"Unexpected response format: {json.dumps(result, indent=2)}")
                return []

            results = result.get("data", {}).get("Get", {}).get(collection_name, [])
            if not results:
                print(f"No results found in collection: {collection_name}")
                return []

            # Process each result to ensure proper structure and include relevance score
            processed_results = []
            for r in results:
                if "text" in r and "metadata" in r:
                    try:
                        # Parse metadata JSON string back to object
                        metadata = (
                            json.loads(r["metadata"])
                            if isinstance(r["metadata"], str)
                            else r["metadata"]
                        )
                        # Get certainty score (1 is most relevant, 0 is least relevant)
                        certainty = r.get("_additional", {}).get("certainty", 0)
                        processed_results.append(
                            {
                                "text": r["text"],
                                "metadata": metadata,
                                "relevance": certainty,
                            }
                        )
                    except json.JSONDecodeError as e:
                        print(f"Error parsing result metadata: {e}")
                        continue

            # Return all results, let the caller handle relevance filtering
            return processed_results
        except Exception as e:
            print(f"Error in vector store search: {type(e).__name__}: {str(e)}")
            return []

    def search_all_collections(
        self,
        query_vector: List[float],
        filters: Optional[Dict] = None,
        limit: int = 5,
    ) -> List[Dict]:
        """Search for similar documents across all collections."""
        try:
            collections = self.list_collections()
            if not collections:
                print("No collections found in vector store")
                return []

            print(f"Searching across collections: {collections}")
            all_results = []
            empty_collections = []
            error_collections = []

            for collection in collections:
                try:
                    results = self._search_collection(
                        collection, query_vector, filters, limit
                    )
                    if results:
                        # Add collection name to each result
                        for result in results:
                            result["collection"] = collection
                        all_results.extend(results)
                    else:
                        empty_collections.append(collection)
                except Exception as e:
                    print(
                        f"Error searching collection {collection}: {type(e).__name__}: {str(e)}"
                    )
                    error_collections.append(collection)

            if empty_collections:
                print(f"Collections with no results: {empty_collections}")
            if error_collections:
                print(f"Collections with errors: {error_collections}")

            if not all_results:
                print(
                    "No results found across any collections "
                    f"(searched {len(collections)} collections)"
                )
                return []

            # Sort all results by relevance
            sorted_results = sorted(
                all_results, key=lambda x: x.get("relevance", 0), reverse=True
            )[:limit]

            print(
                f"Found {len(sorted_results)} results across "
                f"{len(collections) - len(empty_collections) - len(error_collections)} "
                "collections"
            )
            return sorted_results
        except Exception as e:
            print(f"Error in search_all_collections: {type(e).__name__}: {str(e)}")
            return []

    def list_collections(self) -> List[str]:
        """List all available collections."""
        schema = self.client.schema.get()
        return [class_obj["class"] for class_obj in schema["classes"]]

    def list_documents(
        self, collection_name: str, skip: int = 0, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """List documents in a collection with pagination."""
        try:
            query = (
                self.client.query.get(
                    collection_name, ["text", "metadata", "_additional {id}"]
                )
                .with_limit(limit)
                .with_offset(skip)
            )

            result = query.do()
            if not result or "data" not in result:
                return []

            documents = result.get("data", {}).get("Get", {}).get(collection_name, [])

            # Process documents to include IDs
            processed_docs = []
            for doc in documents:
                if "_additional" in doc and "id" in doc["_additional"]:
                    try:
                        # Parse metadata JSON string back to object
                        metadata = (
                            json.loads(doc["metadata"])
                            if isinstance(doc["metadata"], str)
                            else doc["metadata"]
                        )
                        processed_docs.append(
                            {
                                "id": doc["_additional"]["id"],
                                "text": doc["text"],
                                "metadata": metadata,
                            }
                        )
                    except json.JSONDecodeError as e:
                        print(f"Error parsing document metadata: {e}")
                        continue
            return processed_docs
        except Exception as e:
            print(f"Error listing documents: {type(e).__name__}: {str(e)}")
            return []

    def document_exists(self, collection_name: str, document_id: str) -> bool:
        """Check if a document exists."""
        try:
            # Query for the specific document by ID
            query = (
                self.client.query.get(collection_name, ["_additional {id}"])
                .with_where(
                    {"path": ["id"], "operator": "Equal", "valueString": document_id}
                )
                .with_limit(1)
                .do()
            )

            if not query or "data" not in query:
                return False

            docs = query.get("data", {}).get("Get", {}).get(collection_name, [])
            return len(docs) > 0
        except Exception as e:
            if "404" in str(e):
                # Document not found is an expected case
                return False
            print(f"Error checking document existence: {type(e).__name__}: {str(e)}")
            return False

    def delete_document(self, collection_name: str, document_id: str) -> bool:
        """Delete a document by ID."""
        try:
            # First check if document exists
            if not self.document_exists(collection_name, document_id):
                print(
                    f"Document {document_id} not found in collection {collection_name}"
                )
                return False

            try:
                # Attempt deletion using object UUID
                self.client.data_object.delete(
                    class_name=collection_name, uuid=document_id
                )
            except Exception as e:
                print(f"Error during deletion: {type(e).__name__}: {str(e)}")
                return False

            # Verify deletion
            if self.document_exists(collection_name, document_id):
                print(f"Document {document_id} still exists after deletion attempt")
                return False

            print(f"Document {document_id} successfully deleted from {collection_name}")
            return True
        except Exception as e:
            print(f"Error deleting document: {type(e).__name__}: {str(e)}")
            return False

    def get_collection_info(self, collection_name: str) -> Optional[Dict]:
        """Get information about a specific collection."""
        try:
            schema = self.client.schema.get(collection_name)
            if not schema:
                return None
            return schema
        except Exception:
            return None
