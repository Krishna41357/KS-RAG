from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class Source(BaseModel):
    """Source information for a message"""
    title: str
    content: str
    url: Optional[str] = None
    score: Optional[float] = None


class Message(BaseModel):
    """A single message in a chat"""
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str
    sources: List[Source] = []
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ChatResponse(BaseModel):
    """Full chat response with all messages"""
    id: str
    user_id: str
    title: str
    messages: List[Message]
    created_at: datetime
    updated_at: datetime
    message_count: int


class ChatListResponse(BaseModel):
    """Chat summary for list view"""
    id: str
    user_id: str
    title: str
    message_count: int
    last_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime