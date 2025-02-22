from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
import json
from typing import List, Dict, Optional
from ..core.auth import User, get_current_user
from ..core.document_processor import DocumentProcessor
from ..core.vector_store import VectorStore
from ..core.llm_client import LLMClient
from pydantic import BaseModel

router = APIRouter()
doc_processor = DocumentProcessor()
vector_store = VectorStore()
llm_client = LLMClient()


class QueryRequest(BaseModel):
    query: str
    index_name: str
    filters: Optional[Dict] = None


class QueryResponse(BaseModel):
    answer: str
    sources: List[Dict]


@router.post("/documents/{index_name}/upload")
async def upload_document(
    index_name: str,
    file: UploadFile = File(...),
    metadata: Optional[Dict] = None,
    current_user: User = Depends(get_current_user),
):
    """Upload and process a document."""
    if not metadata:
        metadata = {}

    # Add user info to metadata for access control
    metadata.update(
        {"owner": current_user.username, "allowed_roles": current_user.roles}
    )

    try:
        # Read file content
        content = await file.read()

        # Process document into chunks with metadata
        chunks = doc_processor.process_document(content, metadata)

        # Get embeddings for all chunks
        texts = [chunk["text"] for chunk in chunks]
        embeddings = llm_client.get_embeddings(texts)

        # Store in vector database - metadata will be JSON encoded by vector store
        vector_store.add_documents(index_name, chunks, embeddings)

        return {
            "message": "Document uploaded and processed successfully",
            "chunks": len(chunks),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/documents/{index_name}/query", response_model=QueryResponse)
async def query_documents(
    query_request: QueryRequest, current_user: User = Depends(get_current_user)
):
    """Query documents using RAG."""
    try:
        print(f"Processing query request for index: {query_request.index_name}")
        print(f"Query: {query_request.query}")

        # Get query embedding
        print("Getting query embedding...")
        query_embedding = llm_client.get_query_embedding(query_request.query)
        print("Query embedding obtained successfully")

        # Search vector store
        print("Searching vector store...")
        results = vector_store.search(
            query_request.index_name, query_embedding, filters=None
        )
        print(f"Found {len(results)} results from vector store")

        # Filter results after search since metadata is now a JSON string
        filtered_results = []
        print("Filtering results based on user roles...")
        print(f"Current user roles: {current_user.roles}")
        for i, result in enumerate(results):
            print(f"\nProcessing result {i}:")
            print(f"Raw result: {result}")
            try:
                # Get and parse metadata
                metadata = result["metadata"]
                print(f"Raw metadata: {metadata}")
                print(f"Metadata type: {type(metadata)}")

                # Parse metadata if it's a string (handle double encoding)
                if isinstance(metadata, str):
                    try:
                        # First parse - converts outer JSON string to inner JSON string
                        metadata = json.loads(metadata)
                        # Second parse - converts inner JSON string to dict
                        if isinstance(metadata, str):
                            metadata = json.loads(metadata)
                    except json.JSONDecodeError as e:
                        print(f"Error decoding metadata: {e}")
                        continue
                elif not isinstance(metadata, dict):
                    print(f"Unexpected metadata type: {type(metadata)}")
                    continue

                print(f"Parsed metadata: {metadata}")

                allowed_roles = metadata.get("allowed_roles", [])
                print(f"Allowed roles: {allowed_roles}")
                if any(role in allowed_roles for role in current_user.roles):
                    result["metadata"] = metadata
                    filtered_results.append(result)
                    print("Result added to filtered results")
                else:
                    print("Result filtered out due to roles")
            except json.JSONDecodeError as e:
                print(f"Error decoding metadata: {e}")
                continue
            except Exception as e:
                print(
                    f"Unexpected error processing result: {type(e).__name__}: {str(e)}"
                )
                continue

        results = filtered_results
        print(f"After filtering: {len(results)} results")

        if not results:
            print("No results found after filtering")
            return QueryResponse(answer="No relevant documents found.", sources=[])

        # Generate answer using LLM
        print("Generating answer using LLM...")
        answer = llm_client.get_completion(query_request.query, results)
        print("Answer generated successfully")

        # Format sources
        sources = [{"text": r["text"], "metadata": r["metadata"]} for r in results]

        return QueryResponse(answer=answer, sources=sources)
    except Exception as e:
        print(f"Error in query_documents: {type(e).__name__}: {str(e)}")
        print(
            f"Error details: {e.__dict__ if hasattr(e, '__dict__') else 'No additional details'}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
