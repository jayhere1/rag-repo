from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from typing import Dict, List
from ..core.auth import (
    User,
    Token,
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
)

router = APIRouter()

# In-memory user store (replace with database in production)
fake_users_db = {
    "admin": {
        "username": "admin",
        "hashed_password": get_password_hash("admin"),
        "roles": ["admin"],
        "disabled": False,
    },
    "user": {
        "username": "user",
        "hashed_password": get_password_hash("user"),
        "roles": ["user"],
        "disabled": False,
    },
}


@router.post("/auth/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = fake_users_db.get(form_data.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": user["username"], "roles": user["roles"]}
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/auth/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/auth/roles", response_model=List[str])
async def get_user_roles(current_user: User = Depends(get_current_user)):
    return current_user.roles
