import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from ..core.auth import (
    User,
    Token,
    create_access_token,
    get_current_user,
    verify_password,
    fake_users_db,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/auth/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    logger.info(f"Login attempt for username: {form_data.username}")

    user = fake_users_db.get(form_data.username)
    if not user:
        logger.warning(f"User not found: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    logger.info("Verifying password...")
    if not verify_password(form_data.password, user["hashed_password"]):
        logger.warning(f"Invalid password for user: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    logger.info(f"Creating access token for user: {form_data.username}")
    access_token = create_access_token(
        data={"sub": user["username"], "roles": user["roles"]}
    )
    logger.info("Login successful")
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/auth/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/auth/roles", response_model=List[str])
async def get_user_roles(current_user: User = Depends(get_current_user)):
    return current_user.roles


@router.get("/auth/users", response_model=List[str])
async def list_users(current_user: User = Depends(get_current_user)):
    """List all usernames for document access assignment."""
    if not any(role.lower() == "admin" for role in current_user.roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can list users",
        )
    return list(fake_users_db.keys())
