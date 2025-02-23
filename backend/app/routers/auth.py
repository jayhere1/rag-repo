import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from typing import List
from ..core.auth import (
    User,
    Token,
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
)

router = APIRouter()

# Get password from environment variable
USER_PASSWORD = os.environ["USER_PASSWORD"]  # Required environment variable

# In-memory user store (replace with database in production)
fake_users_db = {
    "admin@demo.com": {
        "username": "admin@demo.com",
        "hashed_password": get_password_hash(USER_PASSWORD),
        "roles": ["admin"],
        "disabled": False,
    },
    "hr@demo.com": {
        "username": "hr@demo.com",
        "hashed_password": get_password_hash(USER_PASSWORD),
        "roles": ["hr"],
        "disabled": False,
    },
    "operator@demo.com": {
        "username": "operator@demo.com",
        "hashed_password": get_password_hash(USER_PASSWORD),
        "roles": ["operator"],
        "disabled": False,
    },
    "safetyinspector@demo.com": {
        "username": "safetyinspector@demo.com",
        "hashed_password": get_password_hash(USER_PASSWORD),
        "roles": ["inspector"],
        "disabled": False,
    },
    "fieldtechnician@demo.com": {
        "username": "fieldtechnician@demo.com",
        "hashed_password": get_password_hash(USER_PASSWORD),
        "roles": ["technician"],
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
