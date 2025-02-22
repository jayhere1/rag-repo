import weaviate
import json
from typing import List, Dict, Optional
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
    ):
        """Add documents with their vectors to a collection."""
        with self.client.batch as batch:
            batch.batch_size = 100
            for doc, vector in zip(documents, vectors):
                # Ensure metadata is a dict, not a JSON string
                metadata = doc["metadata"]
                if isinstance(metadata, str):
                    try:
                        metadata = json.loads(metadata)
                    except json.JSONDecodeError:
                        pass

                properties = {
                    "text": doc["text"],
                    "metadata": json.dumps(metadata),
                }
                batch.add_data_object(
                    data_object=properties,
                    class_name=collection_name,
                    vector=vector,
                )

    def search(
        self,
        collection_name: str,
        query_vector: List[float],
        filters: Optional[Dict] = None,
        limit: int = 5,
    ) -> List[Dict]:
        """Search for similar documents in a collection."""
        where_filter = None
        if filters:
            where_filter = {
                "operator": "And",
                "operands": [
                    {"path": ["metadata", k], "operator": "Equal", "valueString": v}
                    for k, v in filters.items()
                ],
            }

        query = (
            self.client.query.get(collection_name, ["text", "metadata"])
            .with_near_vector({"vector": query_vector})
            .with_limit(limit)
        )

        if where_filter:
            query = query.with_where(where_filter)

        try:
            result = query.do()
            results = result["data"]["Get"][collection_name]

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

    def get_collection_info(self, collection_name: str) -> Dict:
        """Get information about a specific collection."""
        try:
            schema = self.client.schema.get(collection_name)
            if not schema:
                return None
            return schema
        except Exception:
            return None
