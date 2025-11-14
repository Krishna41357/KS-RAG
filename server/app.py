import os
from typing import List
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from vectorstore import index_documents
from answer_generator import answer_query
from controllers.auth import get_current_user
from routes.users import router as users_router
from routes.chats import router as chat_router

load_dotenv()

app = FastAPI(
    title="RAG Chatbot API",
    description="Upload PDFs and query them using RAG (Retrieval-Augmented Generation) with chat history",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(users_router)
app.include_router(chat_router)

# Upload directory
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class QueryRequest(BaseModel):
    question: str


@app.get("/")
def read_root():
    """Root endpoint - API information."""
    return {
        "message": "RAG Chatbot API is running",
        "version": "2.0.0",
        "features": [
            "PDF upload and vector embeddings",
            "Semantic search with Cohere",
            "Answer generation with Groq LLM",
            "User authentication with JWT",
            "Chat history and conversations"
        ],
        "endpoints": {
            "Documents": {
                "POST /upload": "Upload PDFs (max 4) and create embeddings",
                "POST /query": "Query PDFs (public, no auth required)"
            },
            "Authentication": {
                "POST /users/register": "Register a new user",
                "POST /users/login": "Login and get JWT token",
                "GET /users/me": "Get current user info (requires auth)"
            },
            "Chats": {
                "POST /chats": "Create a new chat conversation",
                "GET /chats": "Get all user's chats",
                "GET /chats/{chat_id}": "Get specific chat with messages",
                "POST /chats/{chat_id}/messages": "Add message to chat and get response",
                "PATCH /chats/{chat_id}": "Update chat (title, archive)",
                "DELETE /chats/{chat_id}": "Delete a chat"
            }
        }
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "message": "API is running and ready to accept queries"
    }


@app.post("/upload")
async def upload_pdfs(files: List[UploadFile] = File(...)):
    """
    Upload up to 4 PDFs, process and store embeddings.
    
    This will:
    1. Save uploaded PDFs to the uploads folder
    2. Extract text and create chunks
    3. Generate vector embeddings using Cohere
    4. Store embeddings in MongoDB
    
    Note: This replaces existing embeddings. For production, you might want
    to implement incremental updates or separate collections per user.
    """
    if len(files) > 4:
        raise HTTPException(status_code=400, detail="Maximum 4 PDF files allowed.")

    saved_paths = []
    for f in files:
        if not f.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=400, 
                detail=f"Only PDF files supported: {f.filename}"
            )
        dest = os.path.join(UPLOAD_DIR, f.filename)
        with open(dest, "wb") as out_file:
            out_file.write(await f.read())
        saved_paths.append(dest)

    try:
        total_chunks = index_documents(saved_paths)
        return JSONResponse({
            "status": "success",
            "message": "PDFs uploaded and indexed successfully",
            "indexed_files": len(saved_paths),
            "indexed_chunks": total_chunks,
            "file_names": [os.path.basename(p) for p in saved_paths]
        })
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error indexing documents: {str(e)}"
        )


@app.post("/query")
def query_docs(req: QueryRequest):
    """
    Query the stored embeddings (public endpoint - no authentication required).
    
    For one-off queries without chat history.
    Use POST /chats for persistent conversations.
    
    Request body:
    {
        "question": "Your question here"
    }
    
    Response:
    {
        "answer": "Generated answer",
        "sources": [{"text": "...", "pdf_name": "..."}],
        "question": "Your question"
    }
    """
    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        answer, sources = answer_query(question)
        return JSONResponse({
            "answer": answer,
            "sources": sources,
            "question": question
        })
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error during query: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)