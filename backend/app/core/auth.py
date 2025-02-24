from datetime import datetime, timedelta
from typing import Optional, List
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from .config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


# Document categories that users can have access to
DOCUMENT_CATEGORIES = {
    "HR_DOCS": "hr_docs",  # HR documents, policies, personnel files
    "OPERATIONS": "operations",  # Operating procedures, manuals
    "SAFETY": "safety",  # Safety protocols, inspection reports
    "TECHNICAL": "technical",  # Technical specifications, maintenance docs
    "ADMIN": "admin",  # Administrative access to all documents
}


# In-memory user store (replace with database in production)
fake_users_db = {
    "admin@demo.com": {
        "username": "admin@demo.com",
        "hashed_password": get_password_hash(settings.USER_PASSWORD),
        "roles": ["admin"],
        "access_categories": list(DOCUMENT_CATEGORIES.values()),
        "disabled": False,
    },
    "hr@demo.com": {
        "username": "hr@demo.com",
        "hashed_password": get_password_hash(settings.USER_PASSWORD),
        "roles": [],
        "access_categories": [
            DOCUMENT_CATEGORIES["HR_DOCS"],
            DOCUMENT_CATEGORIES["SAFETY"],
        ],
        "disabled": False,
    },
    "operator@demo.com": {
        "username": "operator@demo.com",
        "hashed_password": get_password_hash(settings.USER_PASSWORD),
        "roles": [],
        "access_categories": [
            DOCUMENT_CATEGORIES["OPERATIONS"],
            DOCUMENT_CATEGORIES["SAFETY"],
            DOCUMENT_CATEGORIES["TECHNICAL"],
        ],
        "disabled": False,
    },
    "safetyinspector@demo.com": {
        "username": "safetyinspector@demo.com",
        "hashed_password": get_password_hash(settings.USER_PASSWORD),
        "roles": [],
        "access_categories": [
            DOCUMENT_CATEGORIES["SAFETY"],
            DOCUMENT_CATEGORIES["OPERATIONS"],
        ],
        "disabled": False,
    },
    "fieldtechnician@demo.com": {
        "username": "fieldtechnician@demo.com",
        "hashed_password": get_password_hash(settings.USER_PASSWORD),
        "roles": [],
        "access_categories": [
            DOCUMENT_CATEGORIES["TECHNICAL"],
            DOCUMENT_CATEGORIES["SAFETY"],
            DOCUMENT_CATEGORIES["OPERATIONS"],
        ],
        "disabled": False,
    },
}


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None
    roles: List[str] = []
    access_categories: List[str] = []


class User(BaseModel):
    username: str
    roles: List[str]
    access_categories: List[str] = []  # Default to empty list
    disabled: Optional[bool] = None


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    # Ensure access_categories is included in the token
    if "access_categories" not in to_encode and "sub" in to_encode:
        user = fake_users_db.get(to_encode["sub"])
        if user and "access_categories" in user:
            to_encode["access_categories"] = user["access_categories"]
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(
            username=username,
            roles=payload.get("roles", []),
            access_categories=payload.get("access_categories", []),
        )
    except JWTError:
        raise credentials_exception

    # In a real application, you would fetch the user from a database
    user = User(
        username=token_data.username,
        roles=token_data.roles,
        access_categories=token_data.access_categories,
    )
    if user is None:
        raise credentials_exception
    return user


def check_access_category(required_categories: List[str]):
    """Check if user has access to required document categories."""

    async def category_checker(current_user: User = Depends(get_current_user)):
        # Admin has access to all categories
        if "admin" in current_user.roles:
            return current_user

        missing_access = [
            cat
            for cat in required_categories
            if cat not in current_user.access_categories
        ]
        if missing_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient document category access",
            )
        return current_user

    return category_checker


def check_role(required_roles: List[str]):
    async def role_checker(current_user: User = Depends(get_current_user)):
        for role in required_roles:
            if role not in current_user.roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have the required role to access this resource",
                )
        return current_user

    return role_checker
