import pytest
from fastapi import HTTPException
from app.core.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    check_role,
    check_access_category,
    fake_users_db,
    DOCUMENT_CATEGORIES,
    User,
)


def test_password_hashing():
    password = "testpassword123"
    hashed = get_password_hash(password)
    assert verify_password(password, hashed)
    assert not verify_password("wrongpassword", hashed)


def test_token_creation():
    test_data = {
        "sub": "admin@demo.com",
        "roles": ["admin"],
        "access_categories": list(DOCUMENT_CATEGORIES.values()),
    }
    token = create_access_token(test_data)
    assert isinstance(token, str)
    assert len(token) > 0


@pytest.mark.asyncio
async def test_admin_role_check():
    admin_user = User(
        username="admin@demo.com",
        roles=["admin"],
        access_categories=list(DOCUMENT_CATEGORIES.values()),
    )

    # Admin should have access to admin-only resources
    role_checker = check_role(["admin"])
    result = await role_checker(admin_user)
    assert result == admin_user


@pytest.mark.asyncio
async def test_non_admin_role_check():
    hr_user = User(
        username="hr@demo.com",
        roles=[],
        access_categories=[
            DOCUMENT_CATEGORIES["HR_DOCS"],
            DOCUMENT_CATEGORIES["SAFETY"],
        ],
    )

    # HR user should not have access to admin-only resources
    role_checker = check_role(["admin"])
    with pytest.raises(HTTPException) as exc_info:
        await role_checker(hr_user)
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_category_access():
    hr_user = User(
        username="hr@demo.com",
        roles=[],
        access_categories=[
            DOCUMENT_CATEGORIES["HR_DOCS"],
            DOCUMENT_CATEGORIES["SAFETY"],
        ],
    )

    # HR user should have access to HR docs
    category_checker = check_access_category([DOCUMENT_CATEGORIES["HR_DOCS"]])
    result = await category_checker(hr_user)
    assert result == hr_user

    # HR user should not have access to technical docs
    category_checker = check_access_category([DOCUMENT_CATEGORIES["TECHNICAL"]])
    with pytest.raises(HTTPException) as exc_info:
        await category_checker(hr_user)
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_admin_category_access():
    admin_user = User(
        username="admin@demo.com",
        roles=["admin"],
        access_categories=list(DOCUMENT_CATEGORIES.values()),
    )

    # Admin should have access to all categories
    for category in DOCUMENT_CATEGORIES.values():
        category_checker = check_access_category([category])
        result = await category_checker(admin_user)
        assert result == admin_user


@pytest.mark.asyncio
async def test_multiple_category_access():
    operator = User(
        username="operator@demo.com",
        roles=[],
        access_categories=[
            DOCUMENT_CATEGORIES["OPERATIONS"],
            DOCUMENT_CATEGORIES["SAFETY"],
            DOCUMENT_CATEGORIES["TECHNICAL"],
        ],
    )

    # Operator should have access to multiple assigned categories
    category_checker = check_access_category(
        [DOCUMENT_CATEGORIES["OPERATIONS"], DOCUMENT_CATEGORIES["TECHNICAL"]]
    )
    result = await category_checker(operator)
    assert result == operator

    # But not to HR docs
    category_checker = check_access_category([DOCUMENT_CATEGORIES["HR_DOCS"]])
    with pytest.raises(HTTPException) as exc_info:
        await category_checker(operator)
    assert exc_info.value.status_code == 403


def test_fake_users_db_consistency():
    # Test that all users in fake_users_db have valid structure
    for username, user_data in fake_users_db.items():
        assert "username" in user_data
        assert "hashed_password" in user_data
        assert "roles" in user_data
        assert "access_categories" in user_data
        assert "disabled" in user_data
        assert isinstance(user_data["roles"], list)
        assert isinstance(user_data["access_categories"], list)
        assert isinstance(user_data["disabled"], bool)

        # Verify all access categories are valid
        for category in user_data["access_categories"]:
            assert category in DOCUMENT_CATEGORIES.values()
