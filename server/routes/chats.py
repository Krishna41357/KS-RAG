from typing import List
from fastapi import APIRouter, HTTPException, status, Depends, Query

from models.chat import (
    ChatCreate, ChatUpdate, ChatResponse,
    ChatListResponse, QueryRequest, QueryResponse
)
from controllers.auth import get_current_user
from controllers.chat import (
    create_chat, get_user_chats, get_chat_by_id,
    add_message_to_chat, update_chat_title,
    delete_chat, delete_all_user_chats, generate_chat_title
)
from answer_generator import answer_query

router = APIRouter(prefix="/chats", tags=["chats"])


@router.post("/", response_model=ChatResponse, status_code=status.HTTP_201_CREATED)
async def create_new_chat(
    chat_data: ChatCreate,
    current_user=Depends(get_current_user)
):
    """
    Create a new chat session.
    Request body:
    {
        "title": "My New Chat" (optional)
    }
    """
    chat_id = create_chat(current_user.user_id, chat_data.title)
    chat = get_chat_by_id(chat_id, current_user.user_id)

    if not chat:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create chat"
        )

    return chat


@router.get("/", response_model=List[ChatListResponse])
async def get_all_chats(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user=Depends(get_current_user)
):
    """
    Get all chats for the authenticated user.
    Query parameters:
    - skip: Number of chats to skip (pagination)
    - limit: Maximum number of chats to return (max 100)
    """
    chats = get_user_chats(current_user.user_id, skip, limit)
    return chats


@router.get("/{chat_id}", response_model=ChatResponse)
async def get_chat(
    chat_id: str,
    current_user=Depends(get_current_user)
):
    """
    Get a specific chat by ID with all messages.
    """
    chat = get_chat_by_id(chat_id, current_user.user_id)

    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )

    return chat


@router.put("/{chat_id}", response_model=ChatResponse)
async def update_chat(
    chat_id: str,
    chat_update: ChatUpdate,
    current_user=Depends(get_current_user)
):
    """
    Update chat title.
    Request body:
    {
        "title": "Updated Chat Title"
    }
    """
    success = update_chat_title(chat_id, current_user.user_id, chat_update.title)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found or update failed"
        )

    chat = get_chat_by_id(chat_id, current_user.user_id)
    return chat


@router.delete("/{chat_id}")
async def delete_chat_endpoint(
    chat_id: str,
    current_user=Depends(get_current_user)
):
    """
    Delete a specific chat.
    """
    success = delete_chat(chat_id, current_user.user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )

    return {"message": "Chat deleted successfully"}


@router.delete("/")
async def delete_all_chats(
    current_user=Depends(get_current_user)
):
    """
    Delete all chats for the authenticated user.
    """
    deleted_count = delete_all_user_chats(current_user.user_id)

    return {
        "message": f"Deleted {deleted_count} chat(s) successfully",
        "deleted_count": deleted_count
    }


@router.post("/query", response_model=QueryResponse)
async def query_in_chat(
    query: QueryRequest,
    current_user=Depends(get_current_user)
):
    """
    Send a query within a chat session.

    Request body:
    {
        "question": "Your question here",
        "chat_id": "optional_chat_id" // If not provided, creates new chat
    }

    This endpoint:
    1. Creates a new chat if chat_id is not provided
    2. Adds the user's question to the chat
    3. Generates an answer using RAG
    4. Adds the assistant's answer to the chat
    5. Auto-generates title from first message if needed
    """
    question = query.question.strip()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty"
        )

    # Get or create chat
    chat_id = query.chat_id
    is_first_message = False

    if not chat_id:
        # Create new chat with a temporary title
        chat_id = create_chat(current_user.user_id, "New Chat")
        is_first_message = True
    else:
        # Verify chat exists and belongs to user
        chat = get_chat_by_id(chat_id, current_user.user_id)
        if not chat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat not found"
            )
        is_first_message = len(chat.messages) == 0

    try:
        # Add user message to chat
        add_message_to_chat(
            chat_id=chat_id,
            user_id=current_user.user_id,
            role="user",
            content=question,
            sources=[]
        )

        # Generate answer using RAG
        answer, sources = answer_query(question)

        # Convert sources to dict format
        sources_dict = [
            {
                "pdf_name": s.get("pdf_name", ""),
                "page": s.get("page", 0),
                "score": s.get("score", 0.0),
                "snippet": s.get("snippet", "")
            }
            for s in sources
        ]

        # Add assistant message to chat
        add_message_to_chat(
            chat_id=chat_id,
            user_id=current_user.user_id,
            role="assistant",
            content=answer,
            sources=sources_dict
        )

        # Auto-generate title from first message
        if is_first_message:
            title = generate_chat_title(question)
            update_chat_title(chat_id, current_user.user_id, title)

        return QueryResponse(
            chat_id=chat_id,
            answer=answer,
            sources=sources_dict,
            question=question,
            saved_to_history=True
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing query: {str(e)}"
        )
