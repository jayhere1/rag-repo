from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    UploadFile,
    File,
    Form,
    Query,
)
import json
from typing import List, Dict, Optional
from datetime import datetime
from ..core.auth import User, get_current_user
from ..core.document_processor import DocumentProcessor
from ..core.vector_store import VectorStore
from ..core.llm_client import LLMClient
from pydantic import BaseModel

router = APIRouter()
doc_processor = DocumentProcessor()
vector_store = VectorStore()
llm_client = LLMClient()


class DocumentAccess(BaseModel):
    roles: List[str] = []
    users: List[str] = []


class QueryRequest(BaseModel):
    query: str
    index_name: Optional[str] = None
    filters: Optional[Dict] = None


class DocumentUploadRequest(BaseModel):
    access: DocumentAccess

    @classmethod
    def from_json(cls, json_str: str) -> "DocumentUploadRequest":
        """Create a DocumentUploadRequest from a JSON string."""
        try:
            data = json.loads(json_str)
            if isinstance(data, dict) and "access" in data and isinstance(data["access"], dict):
                # If the data has nested access structure, use the inner access object
                if "roles" in data["access"] and "users" in data["access"]:
                    return cls(access=DocumentAccess(**data["access"]))
            raise ValueError("Invalid access data structure")
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON: {str(e)}")
        except Exception as e:
            raise ValueError(f"Invalid data structure: {str(e)}")


class DocumentMetadata(BaseModel):
    owner: str
    allowed_roles: List[str]
    allowed_users: List[str]
    filename: str
    upload_time: str
    size: int


class Document(BaseModel):
    id: str
    text: str
    metadata: DocumentMetadata


class QueryResponse(BaseModel):
    answer: str
    sources: List[Dict]


class ListDocumentsResponse(BaseModel):
    documents: List[Document]


@router.get("/documents/{index_name}", response_model=ListDocumentsResponse)
async def list_documents(
    index_name: str,
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
):
    """List documents in an index with pagination."""
    try:
        try:
            # Get all documents
            documents = vector_store.list_documents(
                index_name, skip=(page - 1) * limit, limit=limit
            )

            # Filter based on access control
            filtered_docs = []
            for doc in documents:
                try:
                    metadata = doc.get("metadata", "{}")
                    if isinstance(metadata, str):
                        metadata = json.loads(metadata)

                    # Ensure metadata is a dictionary
                    if not isinstance(metadata, dict):
                        metadata = {}

                    # Create document with properly structured metadata
                    document = {
                        "id": doc.get("id", ""),
                        "text": doc.get("text", ""),
                        "metadata": {
                            "owner": metadata.get("owner", ""),
                            "allowed_roles": metadata.get("allowed_roles", []),
                            "allowed_users": metadata.get("allowed_users", []),
                            "filename": metadata.get("filename", "unknown"),
                            "upload_time": metadata.get("upload_time", ""),
                            "size": metadata.get("size", 0),
                        },
                    }

                    # Admin can see all documents
                    if "admin" in current_user.roles:
                        filtered_docs.append(document)
                        continue

                    # Check user roles and specific access
                    allowed_roles = metadata.get("allowed_roles", [])
                    allowed_users = metadata.get("allowed_users", [])

                    if (
                        any(role in allowed_roles for role in current_user.roles)
                        or current_user.username in allowed_users
                    ):
                        filtered_docs.append(document)
                except Exception as e:
                    print(f"Error processing document: {e}")
                    continue
        except Exception as e:
            print(f"Error listing documents: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to list documents: {str(e)}",
            )

        return ListDocumentsResponse(documents=filtered_docs)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.delete("/documents/{index_name}/{document_id}")
async def delete_document(
    index_name: str, document_id: str, current_user: User = Depends(get_current_user)
):
    """Delete a document from an index."""
    if "admin" not in current_user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete documents",
        )

    try:
        success = vector_store.delete_document(index_name, document_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
            )
        return {"message": "Document deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/documents/{index_name}/upload")
async def upload_document(
    index_name: str,
    file: UploadFile = File(...),
    access: str = Form(...),
    current_user: User = Depends(get_current_user),
):
    # Parse and validate access data
    try:
        access_request = DocumentUploadRequest.from_json(access)
    except json.JSONDecodeError as e:
        print(f"Error parsing access JSON: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Invalid access data format: {str(e)}"
        )
    except ValueError as e:
        print(f"Error validating access data structure: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        print(f"Error validating access data: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, 
            detail=f"Invalid access data: {str(e)}"
        )
    """Upload and process a document with access control."""
    # Debug logging
    print("Upload request received:")
    print(f"Index: {index_name}")
    print(f"Access data: {access}")
    print(f"File: {file.filename}")
    print(f"Content type: {file.content_type}")

    # Log form data
    form_data = await file.read()
    print(f"Form data length: {len(form_data)}")
    print(f"First 100 bytes: {form_data[:100]}")
    await file.seek(0)  # Reset file pointer for later processing
    # Check if user is admin
    if "admin" not in current_user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can upload documents",
        )

    filename = file.filename or "unknown"
    metadata = {
        "owner": current_user.username,
        "allowed_roles": access_request.access.roles,
        "allowed_users": access_request.access.users,
        "filename": filename,
        "upload_time": datetime.utcnow().isoformat(),
        "size": len(form_data)
    }

    try:
        try:
            # Read file content
            content = await file.read()

            # Process document into chunks with metadata
            chunks = doc_processor.process_document(content, metadata)
            print(f"Successfully processed document into {len(chunks)} chunks")
        except Exception as e:
            print(f"Error processing document: {str(e)}")
            raise

        # Get embeddings for all chunks
        texts = [chunk["text"] for chunk in chunks]
        embeddings = llm_client.get_embeddings(texts)

        # Store in vector database
        vector_store.add_documents(index_name, chunks, embeddings)

        return {
            "message": "Document uploaded and processed successfully",
            "chunks": len(chunks),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/documents/query", response_model=QueryResponse)
async def query_documents(
    query_request: QueryRequest, current_user: User = Depends(get_current_user)
):
    """Query documents using RAG across all collections or a specific collection."""
    try:
        print(
            f"Processing query request for index: {query_request.index_name or 'all'}"
        )
        print(f"Query: {query_request.query}")

        # Get query embedding
        print("Getting query embedding...")
        query_embedding = llm_client.get_query_embedding(query_request.query)
        print("Query embedding obtained successfully")

        # Prepare vector store filters based on user access
        filters = None
        if "admin" not in current_user.roles:
            # Create a filter that matches documents where:
            # 1. User's roles intersect with allowed_roles OR
            # 2. User's username is in allowed_users
            filters = {
                "operator": "Or",
                "operands": [
                    {
                        "operator": "ContainsAny",
                        "path": ["metadata", "allowed_roles"],
                        "valueStringArray": current_user.roles,
                    },
                    {
                        "operator": "ContainsAny",
                        "path": ["metadata", "allowed_users"],
                        "valueStringArray": [current_user.username],
                    },
                ],
            }

        # Search vector store with access control filters
        print("Searching vector store with access filters...")
        if query_request.index_name:
            results = vector_store.search(
                query_request.index_name, query_embedding, filters=filters
            )
        else:
            results = vector_store.search_all_collections(
                query_embedding, filters=filters
            )
        print(f"Found {len(results)} results from vector store")

        # Parse metadata JSON strings
        filtered_results = []
        for result in results:
            try:
                if isinstance(result["metadata"], str):
                    result["metadata"] = json.loads(result["metadata"])
                filtered_results.append(result)
            except (json.JSONDecodeError, Exception) as e:
                print(f"Error processing result: {e}")
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
