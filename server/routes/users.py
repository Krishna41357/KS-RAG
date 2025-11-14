import os
from datetime import timedelta, datetime
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, status, Depends
from pymongo import MongoClient

from models.user import (
    UserCreate, UserLogin, UserResponse, Token, 
    UserUpdate
)
from controllers.auth import (
    get_password_hash, verify_password, 
    create_access_token, get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

load_dotenv()

router = APIRouter(prefix="/users", tags=["users"])

# MongoDB setup
mongo_uri = os.getenv("MONGO_URI")
client = MongoClient(mongo_uri)
db = client["rag_database"]
users_collection = db["users"]


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate):
    """
    Register a new user.
    
    Request body:
    {
        "email": "user@example.com",
        "username": "johndoe",
        "password": "securepass123",
        "full_name": "John Doe" (optional)
    }
    """
    # Check if user already exists
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    if users_collection.find_one({"username": user.username}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create user document
    user_dict = {
        "email": user.email,
        "username": user.username,
        "full_name": user.full_name,
        "hashed_password": get_password_hash(user.password),
        "is_active": True,
        "is_verified": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    # Insert into database
    result = users_collection.insert_one(user_dict)
    
    # Get created user
    created_user = users_collection.find_one({"_id": result.inserted_id})
    
    return UserResponse(
        id=str(created_user["_id"]),
        email=created_user["email"],
        username=created_user["username"],
        full_name=created_user.get("full_name"),
        is_active=created_user["is_active"],
        is_verified=created_user["is_verified"],
        created_at=created_user["created_at"]
    )


@router.post("/login", response_model=Token)
async def login(user_credentials: UserLogin):
    """
    Login user and return JWT token.
    
    Request body:
    {
        "email": "user@example.com",
        "password": "securepass123"
    }
    
    Response:
    {
        "access_token": "eyJ...",
        "token_type": "bearer"
    }
    """
    user = users_collection.find_one({"email": user_credentials.email})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not verify_password(user_credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"], "user_id": str(user["_id"])},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user = Depends(get_current_user)):
    """
    Get current logged-in user information.
    Requires: Authorization header with Bearer token
    """
    user = users_collection.find_one({"email": current_user.email})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        username=user["username"],
        full_name=user.get("full_name"),
        is_active=user["is_active"],
        is_verified=user["is_verified"],
        created_at=user["created_at"]
    )


@router.put("/me", response_model=UserResponse)
async def update_user(
    user_update: UserUpdate,
    current_user = Depends(get_current_user)
):
    """
    Update current user information.
    
    Request body (all fields optional):
    {
        "username": "newusername",
        "full_name": "New Name",
        "email": "newemail@example.com"
    }
    """
    update_data = user_update.dict(exclude_unset=True)
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No data to update"
        )
    
    # Check if username is already taken
    if "username" in update_data:
        existing_user = users_collection.find_one({"username": update_data["username"]})
        if existing_user and str(existing_user["_id"]) != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Check if email is already taken
    if "email" in update_data:
        existing_user = users_collection.find_one({"email": update_data["email"]})
        if existing_user and str(existing_user["_id"]) != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Add updated_at timestamp
    update_data["updated_at"] = datetime.utcnow()
    
    # Update user
    result = users_collection.find_one_and_update(
        {"email": current_user.email},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=str(result["_id"]),
        email=result["email"],
        username=result["username"],
        full_name=result.get("full_name"),
        is_active=result["is_active"],
        is_verified=result["is_verified"],
        created_at=result["created_at"]
    )