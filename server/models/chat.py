from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class Source(BaseModel):
    """Source document information"""
    pdf_name: str
    page: int
    score: float
    snippet: str


class Message(BaseModel):
    """Individual message in a chat"""
    role: str  # 'user' or 'assistant'
    content: str
    sources: Optional[List[Source]] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ChatCreate(BaseModel):
    """Create a new chat session"""
    title: Optional[str] = "New Chat"


class ChatUpdate(BaseModel):
    """Update chat title"""
    title: str


class ChatResponse(BaseModel):
    """Chat response model"""
    id: str
    user_id: str
    title: str
    messages: List[Message]
    created_at: datetime
    updated_at: datetime
    message_count: int


class ChatListResponse(BaseModel):
    """List of chats"""
    id: str
    user_id: str
    title: str
    message_count: int
    last_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class QueryRequest(BaseModel):
    """Query request for a specific chat"""
    question: str
    chat_id: Optional[str] = None  # If None, creates new chat


class QueryResponse(BaseModel):
    """Query response"""
    chat_id: str
    answer: str
    sources: List[Source]
    question: str
    saved_to_history: bool = True
