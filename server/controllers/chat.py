import os
from typing import List, Optional
from datetime import datetime
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

from models.chat import Message, Source, ChatResponse, ChatListResponse

load_dotenv()

# MongoDB setup
mongo_uri = os.getenv("MONGO_URI")
if not mongo_uri:
    raise RuntimeError("MONGO_URI not set in environment")

client = MongoClient(mongo_uri)
db = client["rag_database"]
chats_collection = db["chats"]


def create_chat(user_id: str, title: str = "New Chat") -> str:
    """Create a new chat session. user_id must be provided."""
    if not user_id:
        raise ValueError("user_id is required to create a chat")

    # Ensure user_id is stored as string
    user_id = str(user_id)
    
    chat_doc = {
        "user_id": user_id,
        "title": title or "New Chat",
        "messages": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    print(f"DEBUG create_chat: Creating chat with user_id='{user_id}' (type: {type(user_id).__name__})")
    result = chats_collection.insert_one(chat_doc)
    return str(result.inserted_id)


def get_user_chats(user_id: str, skip: int = 0, limit: int = 50) -> List[ChatListResponse]:
    """Get all chats for a user"""
    print(f"DEBUG get_user_chats: user_id='{user_id}' (type: {type(user_id).__name__})")
    
    if not user_id:
        return []

    # Ensure user_id is string for comparison
    user_id = str(user_id)

    chats = chats_collection.find(
        {"user_id": user_id}
    ).sort("updated_at", -1).skip(skip).limit(limit)

    chat_list = []
    for chat in chats:
        print(f"DEBUG get_user_chats: Found chat id={chat['_id']}, db_user_id='{chat.get('user_id')}'")
        
        last_message = None
        if chat.get("messages"):
            user_messages = [m for m in chat["messages"] if m.get("role") == "user"]
            if user_messages:
                last_message = (user_messages[-1].get("content") or "")[:100]

        chat_list.append(ChatListResponse(
            id=str(chat["_id"]),
            user_id=str(chat["user_id"]),
            title=chat.get("title", "New Chat"),
            message_count=len(chat.get("messages", [])),
            last_message=last_message,
            created_at=chat.get("created_at", datetime.utcnow()),
            updated_at=chat.get("updated_at", datetime.utcnow())
        ))

    return chat_list


def get_chat_by_id(chat_id: str, user_id: str) -> Optional[ChatResponse]:
    """Get a specific chat by ID (and ensure it belongs to user_id)."""
    print(f"DEBUG get_chat_by_id: chat_id='{chat_id}', user_id='{user_id}'")
    
    if not chat_id or not user_id:
        print("DEBUG get_chat_by_id: Missing chat_id or user_id")
        return None

    # Ensure user_id is string for comparison
    user_id = str(user_id)

    try:
        # Convert chat_id to ObjectId
        try:
            chat_obj_id = ObjectId(chat_id)
        except Exception as e:
            print(f"DEBUG get_chat_by_id: Invalid ObjectId format: {chat_id}")
            return None

        # DEBUG: First check if chat exists at all (without user filter)
        chat_any = chats_collection.find_one({"_id": chat_obj_id})
        if chat_any:
            db_user_id = str(chat_any.get('user_id'))  # Convert to string for comparison
            print(f"DEBUG get_chat_by_id: Chat exists in DB")
            print(f"DEBUG get_chat_by_id: DB user_id = '{db_user_id}' (type: {type(db_user_id).__name__})")
            print(f"DEBUG get_chat_by_id: Request user_id = '{user_id}' (type: {type(user_id).__name__})")
            print(f"DEBUG get_chat_by_id: user_id match = {db_user_id == user_id}")
            
            if db_user_id != user_id:
                print(f"DEBUG get_chat_by_id: User ID mismatch! Chat belongs to '{db_user_id}' but request is from '{user_id}'")
                return None
        else:
            print(f"DEBUG get_chat_by_id: Chat {chat_id} does NOT exist in DB at all!")
            return None

        # Now do the actual query with user filter
        chat = chats_collection.find_one({
            "_id": chat_obj_id,
            "user_id": user_id
        })

        if not chat:
            print(f"DEBUG get_chat_by_id: Query with user_id filter returned None")
            return None

        print(f"DEBUG get_chat_by_id: Successfully found chat")

        messages = []
        for msg in chat.get("messages", []):
            # ⭐ FIX: Transform source fields to match Pydantic model
            sources_raw = msg.get("sources", [])
            sources_transformed = []
            
            if sources_raw:
                for s in sources_raw:
                    # Handle both old format (pdf_name, text) and new format (title, content)
                    source_dict = {
                        "title": s.get("title") or s.get("pdf_name", "Unknown"),
                        "content": s.get("content") or s.get("text", ""),
                        "url": s.get("url"),
                        "score": s.get("score")
                    }
                    sources_transformed.append(Source(**source_dict))
            
            messages.append(Message(
                role=msg.get("role", "user"),
                content=msg.get("content", ""),
                sources=sources_transformed,
                timestamp=msg.get("timestamp", datetime.utcnow())
            ))

        return ChatResponse(
            id=str(chat["_id"]),
            user_id=str(chat["user_id"]),
            title=chat.get("title", "New Chat"),
            messages=messages,
            created_at=chat.get("created_at", datetime.utcnow()),
            updated_at=chat.get("updated_at", datetime.utcnow()),
            message_count=len(messages)
        )
    except Exception as e:
        print(f"ERROR get_chat_by_id: {e}")
        import traceback
        traceback.print_exc()
        return None

def add_message_to_chat(
    chat_id: str,
    user_id: str,
    role: str,
    content: str,
    sources: List[dict] = None
) -> bool:
    """Add a message to a chat. Returns True if update succeeded."""
    if not chat_id:
        print("add_message_to_chat: missing chat_id")
        return False
    if not user_id:
        print("add_message_to_chat: missing user_id")
        return False

    # Ensure user_id is string
    user_id = str(user_id)

    try:
        message = {
            "role": role,
            "content": content,
            "sources": sources or [],
            "timestamp": datetime.utcnow()
        }

        result = chats_collection.update_one(
            {"_id": ObjectId(chat_id), "user_id": user_id},
            {
                "$push": {"messages": message},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )

        if result.matched_count == 0:
            print(f"add_message_to_chat: no matching chat for id={chat_id} and user_id={user_id}")
            return False

        return result.modified_count > 0
    except Exception as e:
        print(f"Error adding message: {e}")
        import traceback
        traceback.print_exc()
        return False


def update_chat_title(chat_id: str, user_id: str, title: str) -> bool:
    """Update chat title"""
    if not chat_id or not user_id:
        return False

    # Ensure user_id is string
    user_id = str(user_id)

    try:
        result = chats_collection.update_one(
            {"_id": ObjectId(chat_id), "user_id": user_id},
            {
                "$set": {
                    "title": title or "New Chat",
                    "updated_at": datetime.utcnow()
                }
            }
        )
        return result.modified_count > 0
    except Exception as e:
        print(f"Error updating chat title: {e}")
        return False


def delete_chat(chat_id: str, user_id: str) -> bool:
    """Delete a chat"""
    if not chat_id or not user_id:
        return False
    
    # Ensure user_id is string
    user_id = str(user_id)
    
    try:
        result = chats_collection.delete_one({
            "_id": ObjectId(chat_id),
            "user_id": user_id
        })
        return result.deleted_count > 0
    except Exception as e:
        print(f"Error deleting chat: {e}")
        return False


def delete_all_user_chats(user_id: str) -> int:
    """Delete all chats for a user"""
    if not user_id:
        return 0
    
    # Ensure user_id is string
    user_id = str(user_id)
    
    try:
        result = chats_collection.delete_many({"user_id": user_id})
        return result.deleted_count
    except Exception as e:
        print(f"Error deleting all chats: {e}")
        return 0


def generate_chat_title(first_message: str) -> str:
    """Generate a title from the first message (simple truncation)"""
    if not first_message:
        return "New Chat"
    title = first_message.strip()[:50]
    if len(first_message) > 50:
        title += "..."
    return title or "New Chat"