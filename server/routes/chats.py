# routes/chats.py
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, Field

from controllers.auth import get_current_user
from controllers.chat import (
    create_chat,
    get_user_chats,
    get_chat_by_id,
    add_message_to_chat,
    update_chat_title,
    delete_chat,
    generate_chat_title
)
from models.chat import ChatResponse, ChatListResponse, Message
from answer_generator import answer_query

router = APIRouter(prefix="/chats", tags=["chats"])


# Request models
class ChatCreate(BaseModel):
    """Schema for creating a new chat"""
    title: Optional[str] = Field(None, max_length=200)


class MessageCreate(BaseModel):
    """Schema for creating a new message"""
    content: str = Field(..., min_length=1)


class ChatUpdate(BaseModel):
    """Schema for updating a chat"""
    title: str = Field(..., min_length=1, max_length=200)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_new_chat(
    chat: ChatCreate,
    current_user=Depends(get_current_user)
):
    """
    Create a new chat conversation.
    
    Request body:
    {
        "title": "My Chat" (optional)
    }
    
    Response:
    {
        "chat_id": "..."
    }
    """
    # Validate user_id exists in token
    if not current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: user_id not found. Please log in again."
        )
    
    try:
        title = chat.title or "New Chat"
        user_id = str(current_user.user_id)  # Ensure it's a string
        
        print(f"DEBUG create_new_chat: user_id={user_id}, title={title}")
        
        chat_id = create_chat(
            user_id=user_id,
            title=title
        )
        
        return {
            "chat_id": chat_id,
            "title": title,
            "message": "Chat created successfully"
        }
    except Exception as e:
        print(f"ERROR create_new_chat: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating chat: {str(e)}"
        )


@router.get("", response_model=List[ChatListResponse])
async def list_chats(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user=Depends(get_current_user)
):
    """
    Get all chats for the current user.
    
    Query params:
    - skip: Number of chats to skip (default: 0)
    - limit: Maximum number of chats to return (default: 50, max: 100)
    """
    # Validate user_id exists in token
    if not current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: user_id not found. Please log in again."
        )
    
    try:
        user_id = str(current_user.user_id)  # Ensure it's a string
        
        print(f"DEBUG list_chats: user_id={user_id}, skip={skip}, limit={limit}")
        
        chats = get_user_chats(
            user_id=user_id,
            skip=skip,
            limit=limit
        )
        return chats
    except Exception as e:
        print(f"ERROR list_chats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching chats: {str(e)}"
        )


@router.get("/{chat_id}", response_model=ChatResponse)
async def get_chat(
    chat_id: str,
    current_user=Depends(get_current_user)
):
    """
    Get a specific chat with all messages.
    """
    # Validate user_id exists in token
    if not current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: user_id not found. Please log in again."
        )
    
    user_id = str(current_user.user_id)  # Ensure it's a string
    
    print(f"DEBUG get_chat route: chat_id={chat_id}, user_id={user_id}")
    
    chat = get_chat_by_id(chat_id=chat_id, user_id=user_id)
    
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found or you don't have access to it"
        )
    
    return chat


@router.post("/{chat_id}/messages")
async def add_message(
    chat_id: str,
    message: MessageCreate,
    current_user=Depends(get_current_user)
):
    """
    Add a message to a chat and get AI response.
    
    Request body:
    {
        "content": "Your question here"
    }
    
    Response:
    {
        "user_message": {...},
        "assistant_message": {...}
    }
    """
    # Validate user_id exists in token
    if not current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: user_id not found. Please log in again."
        )
    
    user_id = str(current_user.user_id)  # Ensure it's a string
    
    print(f"DEBUG add_message: chat_id={chat_id}, user_id={user_id}")
    
    # Verify chat exists and belongs to user
    chat = get_chat_by_id(chat_id=chat_id, user_id=user_id)
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found or you don't have access to it"
        )
    
    # Add user message
    user_message_added = add_message_to_chat(
        chat_id=chat_id,
        user_id=user_id,
        role="user",
        content=message.content
    )
    
    if not user_message_added:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add user message"
        )
    
    # If this is the first message, auto-generate title
    if chat.message_count == 0:
        title = generate_chat_title(message.content)
        update_chat_title(
            chat_id=chat_id,
            user_id=user_id,
            title=title
        )
    
    # Get AI response using RAG
    try:
        answer, sources = answer_query(message.content)
    except Exception as e:
        print(f"ERROR generating answer: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating answer: {str(e)}"
        )
    
    # Add assistant message with sources
    assistant_message_added = add_message_to_chat(
        chat_id=chat_id,
        user_id=user_id,
        role="assistant",
        content=answer,
        sources=sources
    )
    
    if not assistant_message_added:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add assistant message"
        )
    
    return {
        "user_message": {
            "role": "user",
            "content": message.content
        },
        "assistant_message": {
            "role": "assistant",
            "content": answer,
            "sources": sources
        }
    }


@router.patch("/{chat_id}")
async def update_chat(
    chat_id: str,
    chat_update: ChatUpdate,
    current_user=Depends(get_current_user)
):
    """
    Update chat title.
    
    Request body:
    {
        "title": "New Title"
    }
    """
    # Validate user_id exists in token
    if not current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: user_id not found. Please log in again."
        )
    
    user_id = str(current_user.user_id)  # Ensure it's a string
    
    print(f"DEBUG update_chat: chat_id={chat_id}, user_id={user_id}")
    
    # Verify chat exists and belongs to user
    chat = get_chat_by_id(chat_id=chat_id, user_id=user_id)
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found or you don't have access to it"
        )
    
    success = update_chat_title(
        chat_id=chat_id,
        user_id=user_id,
        title=chat_update.title
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update chat title"
        )
    
    return {
        "message": "Chat title updated successfully",
        "title": chat_update.title
    }


@router.delete("/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_endpoint(
    chat_id: str,
    current_user=Depends(get_current_user)
):
    """
    Delete a chat permanently.
    """
    # Validate user_id exists in token
    if not current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: user_id not found. Please log in again."
        )
    
    user_id = str(current_user.user_id)  # Ensure it's a string
    
    print(f"DEBUG delete_chat: chat_id={chat_id}, user_id={user_id}")
    
    success = delete_chat(
        chat_id=chat_id,
        user_id=user_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found or you don't have access to it"
        )
    
    return None


# DEBUG ENDPOINT - Remove in production
@router.get("/debug/token-info")
async def debug_token_info(current_user=Depends(get_current_user)):
    """Debug endpoint to check token contents"""
    return {
        "email": current_user.email,
        "user_id": current_user.user_id,
        "user_id_type": type(current_user.user_id).__name__ if current_user.user_id else "None",
        "user_id_is_none": current_user.user_id is None,
        "user_id_value": str(current_user.user_id) if current_user.user_id else "NULL"
    }