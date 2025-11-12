import os
from typing import List
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from vectorstore import index_documents
from answer_generator import answer_query

load_dotenv()

app = FastAPI(title="RAG Chatbot API", description="Upload PDFs and query them using Groq API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class QueryRequest(BaseModel):
    question: str


@app.post("/upload")
async def upload_pdfs(files: List[UploadFile] = File(...)):
    """Upload up to 4 PDFs, process and store embeddings."""
    if len(files) > 4:
        raise HTTPException(status_code=400, detail="Maximum 4 PDF files allowed.")

    saved_paths = []
    for f in files:
        if not f.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"Only PDF files supported: {f.filename}")
        dest = os.path.join(UPLOAD_DIR, f.filename)
        with open(dest, "wb") as out_file:
            out_file.write(await f.read())
        saved_paths.append(dest)

    try:
        total_chunks = index_documents(saved_paths)
        return JSONResponse({
            "status": "success",
            "indexed_files": len(saved_paths),
            "indexed_chunks": total_chunks
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error indexing documents: {str(e)}")


@app.post("/query")
def query_docs(req: QueryRequest):
    """Query the stored embeddings and generate answer using Groq."""
    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        answer, sources = answer_query(question)
        return JSONResponse({"answer": answer, "sources": sources})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during query: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
