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

    def add_documents(
        self, collection_name: str, documents: List[Dict], vectors: List[List[float]]
    ) -> List[str]:
        """Add documents with their vectors to a collection."""
        added_ids = []
        with self.client.batch as batch:
            batch.batch_size = 100
            for doc, vector in zip(documents, vectors):
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

        return added_ids

    def search(
        self,
        collection_name: str,
        query_vector: List[float],
        filters: Optional[Dict] = None,
        limit: int = 5,
    ) -> List[Dict]:
        """Search for similar documents in a collection."""
        where_filter = filters

        query = (
            self.client.query.get(collection_name, ["text", "metadata"])
            .with_near_vector({"vector": query_vector})
            .with_limit(limit)
        )

        if where_filter:
            query = query.with_where(where_filter)

        try:
            result = query.do()
            if not result or "data" not in result:
                print("No data returned from vector store")
                return []

            results = result.get("data", {}).get("Get", {}).get(collection_name, [])
            if not results:
                print(f"No results found in collection: {collection_name}")
                return []

            # Process each result to ensure proper structure
            processed_results = []
            for r in results:
                if "text" in r and "metadata" in r:
                    processed_results.append(
                        {"text": r["text"], "metadata": r["metadata"]}
                    )
            return processed_results
        except Exception as e:
            print(f"Error in vector store search: {type(e).__name__}: {str(e)}")
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
                    processed_docs.append(
                        {
                            "id": doc["_additional"]["id"],
                            "text": doc["text"],
                            "metadata": doc["metadata"],
                        }
                    )
            return processed_docs
        except Exception as e:
            print(f"Error listing documents: {type(e).__name__}: {str(e)}")
            return []

    def delete_document(self, collection_name: str, document_id: str) -> bool:
        """Delete a document by ID."""
        try:
            self.client.data_object.delete(class_name=collection_name, uuid=document_id)
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
