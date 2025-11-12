# RAG Chatbot Server

This directory implements a minimal RAG backend using FastAPI, LangChain, OpenAI embeddings and Chroma for vector storage.

Features
- Upload up to 4 PDFs to `/upload` (multipart/form-data) — they are extracted, chunked and indexed.
- Ask a question to `/query` (JSON {"question": "..."}) — the server retrieves relevant chunks and uses a Chat LLM to answer.

Environment
- Create a `.env` or set `OPENAI_API_KEY` in your environment.

Quick start (Windows PowerShell)

1. Create virtual env and install:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Set API key (PowerShell):

```powershell
$env:OPENAI_API_KEY = 'sk-...'
```

3. Run server:

```powershell
uvicorn app:app --reload --port 8000
```

4. Upload PDFs (example using curl or an API client) and then POST query JSON to `/query`.

Notes
- This example uses OpenAI embeddings + Chroma for simplicity. You can swap embeddings or vector store as needed.
- On first run the server will create `server/data/chroma_db` for persisted vectors.
