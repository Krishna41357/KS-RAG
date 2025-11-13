from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId


class PyObjectId(ObjectId):
    """Custom ObjectId type for Pydantic."""
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")


class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    full_name: Optional[str] = None
    is_active: bool = True
    is_verified: bool = False


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    """Schema for updating user information."""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None


class UserInDB(UserBase):
    """Schema for user stored in database."""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    query_history: List[dict] = []
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }


class UserResponse(BaseModel):
    """Schema for user response (without sensitive data)."""
    id: str
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    
    class Config:
        populate_by_name = True


class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema for token payload."""
    email: Optional[str] = None
    user_id: Optional[str] = None


class QueryHistory(BaseModel):
    """Schema for storing user query history."""
    query: str
    answer: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    sources_count: int = 0