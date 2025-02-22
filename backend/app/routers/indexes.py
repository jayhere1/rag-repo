from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from pydantic import RootModel, BaseModel  # Import RootModel
from ..core.auth import User, check_role, get_current_user
from ..core.vector_store import VectorStore

router = APIRouter()
vector_store = VectorStore()


class IndexResponse(RootModel):
    """Pydantic model for index response"""

    root: Dict[str, Any]


@router.post("/indexes/{index_name}", status_code=status.HTTP_201_CREATED)
async def create_index(
    index_name: str,
    description: str = "",
    current_user: User = Depends(check_role(["admin"])),
):
    """Create a new index (collection) in the vector store."""
    try:
        success = vector_store.create_collection(index_name, description)
        if success:
            return {"message": f"Index '{index_name}' created successfully"}
        return {"message": f"Index '{index_name}' already exists"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.delete("/indexes/{index_name}")
async def delete_index(
    index_name: str, current_user: User = Depends(check_role(["admin"]))
):
    """Delete an index and all its documents."""
    try:
        success = vector_store.delete_collection(index_name)
        if success:
            return {"message": f"Index '{index_name}' deleted successfully"}
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Index '{index_name}' not found",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/indexes", response_model=List[str])
async def list_indexes(current_user: User = Depends(get_current_user)):
    """List all available indexes."""
    try:
        return vector_store.list_collections()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/indexes/{index_name}", response_model=IndexResponse)
async def get_index_info(
    index_name: str, current_user: User = Depends(get_current_user)
):
    """Get information about a specific index."""
    try:
        info = vector_store.get_collection_info(index_name)
        if info:
            return IndexResponse(root=info)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Index '{index_name}' not found",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
