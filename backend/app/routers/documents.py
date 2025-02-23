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
            if (
                isinstance(data, dict)
                and "access" in data
                and isinstance(data["access"], dict)
            ):
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
        # Get all documents
        documents = vector_store.list_documents(
            index_name, skip=(page - 1) * limit, limit=limit
        )

        # Group and filter documents
        doc_groups = {}
        for doc in documents:
            try:
                metadata = doc.get("metadata", "{}")
                if isinstance(metadata, str):
                    metadata = json.loads(metadata)

                # Ensure metadata is a dictionary
                if not isinstance(metadata, dict):
                    metadata = {}

                # Check access permissions with exact string matching
                allowed_roles = metadata.get("allowed_roles", [])
                allowed_users = metadata.get("allowed_users", [])

                print("Access check details:")
                print(f"- Document metadata: {json.dumps(metadata, indent=2)}")
                print(f"- User roles (exact): {current_user.roles}")
                print(f"- Username (exact): {current_user.username}")

                # Check access with case-insensitive comparison
                is_admin = any(role.lower() == "admin" for role in current_user.roles)

                # Check if user role is in allowed roles (case-insensitive)
                user_roles_lower = set(role.lower() for role in current_user.roles)
                allowed_roles_lower = set(role.lower() for role in allowed_roles)
                print(f"- User roles (lower): {sorted(list(user_roles_lower))}")
                print(f"- Allowed roles (lower): {sorted(list(allowed_roles_lower))}")

                # Check for any intersection between user roles and allowed roles
                has_role = bool(user_roles_lower & allowed_roles_lower)

                # Check if username matches
                has_user_access = current_user.username in allowed_users

                print("Access evaluation:")
                print(f"- Admin access: {is_admin}")
                print(f"- Role match: {has_role}")
                print(f"- User match: {has_user_access}")

                has_access = is_admin or has_role or has_user_access
                print(f"- Final decision: {has_access}")

                if has_access:
                    print("Access granted - document included")
                else:
                    print("Access denied - document filtered out")

                if not has_access:
                    continue

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
                        "chunk_index": metadata.get("chunk_index", 0),
                        "total_chunks": metadata.get("total_chunks", 1),
                    },
                }

                # Group by filename and upload time
                group_key = (
                    metadata.get("filename", "unknown"),
                    metadata.get("upload_time", ""),
                )

                if group_key not in doc_groups:
                    doc_groups[group_key] = []
                doc_groups[group_key].append(document)
            except Exception as e:
                print(f"Error processing document: {e}")
                continue

        # Sort chunks within each group and add chunk info
        filtered_docs = []
        for docs in doc_groups.values():
            if not docs:
                continue

            # Sort chunks by index
            docs.sort(key=lambda x: x["metadata"]["chunk_index"])

            # Add all chunks to the first document's metadata
            representative_doc = docs[0]
            chunks = []
            for chunk in docs:
                chunks.append(
                    {
                        "id": chunk["id"],
                        "text": chunk["text"],
                        "index": chunk["metadata"]["chunk_index"],
                    }
                )

            # Update metadata to include chunks
            representative_doc["metadata"]["chunks"] = chunks
            filtered_docs.append(representative_doc)

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
    # Check if user is admin (case-insensitive)
    if not any(role.lower() == "admin" for role in current_user.roles):
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
            detail=f"Invalid access data format: {str(e)}",
        )
    except ValueError as e:
        print(f"Error validating access data structure: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        print(f"Error validating access data: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid access data: {str(e)}",
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
    # Check if user is admin (case-insensitive)
    if not any(role.lower() == "admin" for role in current_user.roles):
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
        "size": len(form_data),
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

        try:
            # Search vector store without filters first
            print("Searching vector store...")
            if query_request.index_name:
                print(f"Searching specific index: {query_request.index_name}")
                results = vector_store.search(query_request.index_name, query_embedding)
            else:
                print("Searching across all indexes")
                results = vector_store.search_all_collections(query_embedding)
            print(f"Found {len(results)} results from vector store")

            # Parse metadata and filter by access
            filtered_results = []
            for result in results:
                try:
                    metadata = (
                        json.loads(result["metadata"])
                        if isinstance(result["metadata"], str)
                        else result["metadata"]
                    )

                    # Print raw metadata for debugging
                    print("Raw metadata:", json.dumps(metadata, indent=2))

                    # Check access permissions with detailed logging
                    allowed_roles = metadata.get("allowed_roles", [])
                    allowed_users = metadata.get("allowed_users", [])

                    print("Access check details:")
                    print(f"- Document metadata: {json.dumps(metadata, indent=2)}")
                    print(f"- User roles (exact): {current_user.roles}")
                    print(f"- Username (exact): {current_user.username}")

                    # Check access with case-insensitive comparison
                    is_admin = any(
                        role.lower() == "admin" for role in current_user.roles
                    )

                    # Check if user role is in allowed roles (case-insensitive)
                    user_roles_lower = set(role.lower() for role in current_user.roles)
                    allowed_roles_lower = set(role.lower() for role in allowed_roles)
                    print(f"- User roles (lower): {sorted(list(user_roles_lower))}")
                    print(
                        f"- Allowed roles (lower): {sorted(list(allowed_roles_lower))}"
                    )

                    # Check for any intersection between user roles and allowed roles
                    has_role = bool(user_roles_lower & allowed_roles_lower)

                    # Check if username matches
                    has_user_access = current_user.username in allowed_users

                    print("Access evaluation:")
                    print(f"- Admin access: {is_admin}")
                    print(f"- Role match: {has_role}")
                    print(f"- User match: {has_user_access}")

                    has_access = is_admin or has_role or has_user_access
                    print(f"- Final decision: {has_access}")

                    if has_access:
                        result["metadata"] = metadata
                        filtered_results.append(result)
                        print("Access granted - document included")
                    else:
                        print("Access denied - document filtered out")
                except Exception as e:
                    print(f"Error processing result metadata: {e}")
                    continue

            results = filtered_results
            print(f"After access filtering: {len(results)} results")

            if not results:
                return QueryResponse(
                    answer=(
                        "No relevant documents found. This could be because:\n"
                        "1. No documents match your query closely enough\n"
                        "2. You don't have access to the relevant documents\n"
                        "3. The documents haven't been properly indexed"
                    ),
                    sources=[],
                )
        except Exception as e:
            print(f"Error during vector store search: {type(e).__name__}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error searching documents",
            )

        # Format and sort sources by relevance
        sources = [
            {
                "text": r["text"],
                "metadata": r["metadata"],
                "relevance": r.get("relevance", 0),
            }
            for r in results
        ]
        sources.sort(key=lambda x: x["relevance"], reverse=True)

        if not sources:
            return QueryResponse(answer="No relevant documents found.", sources=[])

        # Generate answer using LLM with all accessible sources
        print("Generating answer using LLM...")
        answer = llm_client.get_completion(query_request.query, sources)
        print("Answer generated successfully")

        return QueryResponse(answer=answer, sources=sources)
    except Exception as e:
        print(f"Error in query_documents: {type(e).__name__}: {str(e)}")
        print(
            f"Error details: {e.__dict__ if hasattr(e, '__dict__') else 'No additional details'}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
