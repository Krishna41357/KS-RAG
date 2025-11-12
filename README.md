# RAG Chatbot — Complete Setup Guide

A full-stack RAG (Retrieval-Augmented Generation) chatbot with FastAPI backend and Streamlit frontend.

## 📋 Project Structure

```
RAG_chatbot/
├── server/                    # FastAPI backend
│   ├── app.py                # Main FastAPI app
│   ├── vectorstore.py        # Vector indexing & querying (OpenAI embeddings + JSON store)
│   ├── pdf_utils.py          # PDF extraction & chunking
│   ├── requirements.txt       # Backend dependencies
│   ├── README.md             # Backend docs
│   └── .env.example          # Backend env template
│
└── client/                    # Streamlit frontend
    ├── app.py                # Main Streamlit UI
    ├── requirements.txt       # Frontend dependencies
    ├── README.md             # Frontend docs
    └── .env.example          # Frontend env template
```

## 🚀 Quick Start (Windows PowerShell)

### Prerequisites
- Python 3.8 or higher
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))

### Step 1: Set Up Backend

```powershell
# Navigate to server folder
cd server

# Create virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Create .env file with your OpenAI API key
# (or set it as an environment variable)
$env:OPENAI_API_KEY = 'sk-...'

# Start the backend server
uvicorn app:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

**Keep this terminal open!** The server must run while you use the frontend.

### Step 2: Set Up Frontend (in a new terminal)

```powershell
# Navigate to client folder
cd client

# Create virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Start Streamlit frontend
streamlit run app.py
```

Streamlit will open your default browser at `http://localhost:8501`.

---

## 📖 Full Usage

### 1. Upload PDFs (Frontend)
- Open the Streamlit app (http://localhost:8501)
- Use the left sidebar to select up to 4 PDF files
- Click **"Upload & Index"**
- Wait for the status message (indexing takes ~30–60s depending on PDF size and OpenAI API)

### 2. Ask Questions (Frontend)
- Once documents are indexed, type a question
- Click **"Ask"**
- View the AI-generated answer with source citations

### 3. View Sources
- Expand **"📖 Sources"** to see which document chunks were used
- Chat history is preserved in the session

---

## 🔧 Configuration

### Backend Configuration

**File:** `server/.env` (or environment variables)

```
OPENAI_API_KEY=sk-...  # Required: Your OpenAI API key
```

**Other settings (in `server/vectorstore.py`):**
- Embedding model: `text-embedding-3-small` (OpenAI)
- Chat model: `gpt-3.5-turbo` (OpenAI)
- Vector storage: JSON file (persisted to `server/data/chroma_db/`)
- Top-k retrieval: 4 documents

### Frontend Configuration

**File:** `client/.env` (optional)

```
BACKEND_URL=http://localhost:8000  # Backend address (default)
```

---

## 🧪 Testing the API Directly

### Upload PDFs (via curl)

```powershell
curl -X POST "http://localhost:8000/upload" -F "files=@file1.pdf" -F "files=@file2.pdf"
```

**Response:**
```json
{
  "indexed_files": 2,
  "indexed_chunks": 145
}
```

### Ask a Question (via curl)

```powershell
curl -X POST "http://localhost:8000/query" `
  -H "Content-Type: application/json" `
  -d '{"question": "What is the main topic?"}'
```

**Response:**
```json
{
  "answer": "The main topic is...",
  "sources": [
    {
      "source": "file1.pdf",
      "page": 1,
      "snippet": "..."
    }
  ]
}
```

---

## 🐛 Troubleshooting

### "ModuleNotFoundError" when starting backend
- Activate the virtual environment: `.\.venv\Scripts\Activate.ps1`
- Reinstall requirements: `pip install -r requirements.txt`

### "Could not connect to backend" in frontend
- Verify the backend is running: Check the backend terminal for "Uvicorn running"
- Check `BACKEND_URL` in `client/.env` matches your backend address
- If on different machines, update `BACKEND_URL` to the backend server's IP/hostname

### "No documents indexed yet"
- Upload PDFs first and wait for the success message in Streamlit

### Slow responses / API errors
- Check `OPENAI_API_KEY` is set correctly
- Verify your OpenAI account has API credits
- Check OpenAI API status at https://status.openai.com

### PDF not being recognized
- Ensure files are valid PDF files (not encrypted or corrupted)
- Try uploading one PDF at a time

---

## 📦 Dependencies

### Backend
- **FastAPI** — Web framework
- **Uvicorn** — ASGI server
- **OpenAI** — Embeddings & Chat API
- **pypdf** — PDF text extraction
- **numpy** — Vector similarity computation
- **aiofiles, loguru, requests** — Utilities

### Frontend
- **Streamlit** — UI framework
- **Requests** — HTTP client for backend calls
- **python-dotenv** — Environment variable management

---

## 🎯 Architecture Overview

```
┌─────────────┐                      ┌──────────────┐
│  Streamlit  │ (http://localhost:8501)             │
│  Frontend   │                      │              │
│  (browser)  │                      │              │
└──────┬──────┘                      │              │
       │                             │              │
       │ POST /upload (PDF files)    │              │
       │ POST /query (question)      │              │
       │ ──────────────────────────▶ │              │
       │                             │              │
       │     ◀─────────────────────  │ FastAPI     │
       │      (JSON response)        │ Backend     │
       │                             │ (localhost) │
       │                             │              │
       │                             │              │
       │                             │ ┌──────────┐│
       │                             │ │ PDF      ││
       │                             │ │ Chunking ││
       │                             │ │ & Split  ││
       │                             │ └──────────┘│
       │                             │              │
       │                             │ ┌──────────┐│
       │                             │ │ OpenAI   ││
       │                             │ │Embeddings││
       │                             │ └──────────┘│
       │                             │              │
       │                             │ ┌──────────┐│
       │                             │ │ Vector   ││
       │                             │ │ Index    ││
       │                             │ │(JSON)    ││
       │                             │ └──────────┘│
       │                             │              │
       │                             │ ┌──────────┐│
       │                             │ │ OpenAI   ││
       │                             │ │ Chat     ││
       │                             │ │(QA Gen)  ││
       │                             │ └──────────┘│
       │                             │              │
       └─────────────────────────────┘              │
                                                   │
                    http://localhost:8000         │
                                                   │
                                                   │
                    server/data/                   │
                    └─ chroma_db/                  │
                       └─ index.json (vectors)    │
```

---

## 📝 API Endpoints

### POST `/upload`
Upload PDF files to index.

**Request:** multipart/form-data with files
```
files: [file1.pdf, file2.pdf, ...]  (max 4)
```

**Response:** 200 OK
```json
{
  "indexed_files": 2,
  "indexed_chunks": 150
}
```

**Errors:**
- 400: More than 4 files, or non-PDF files provided
- 500: Indexing failed (check OPENAI_API_KEY)

### POST `/query`
Ask a question about the indexed documents.

**Request:** application/json
```json
{
  "question": "What is the main topic?"
}
```

**Response:** 200 OK
```json
{
  "answer": "The main topic is...",
  "sources": [
    {
      "source": "file1.pdf",
      "page": 1,
      "snippet": "The first page contains..."
    }
  ]
}
```

**Errors:**
- 400: Empty question
- 500: No documents indexed, or API error

---

## 🌟 Next Steps & Enhancements

- [ ] Add batch processing for large PDFs
- [ ] Support for different embedding models (Hugging Face, Azure)
- [ ] PostgreSQL vector DB instead of JSON (for scalability)
- [ ] Docker containerization for easy deployment
- [ ] User authentication & multi-tenant support
- [ ] PDF preview in Streamlit
- [ ] Export Q&A results to PDF
- [ ] Web-based admin dashboard for document management

---

## 📄 License

This project is provided as-is for educational and internal use.

---

## 🤝 Support

For issues, check:
1. Backend logs: Check the terminal running `uvicorn`
2. Frontend logs: Check Streamlit terminal output
3. API responses: Use curl to test endpoints directly
4. Environment variables: Verify `OPENAI_API_KEY` is set

**Common Issues:**
- Backend not running: Start it with `uvicorn app:app --reload --port 8000`
- API key missing: Set `OPENAI_API_KEY` environment variable
- Connection refused: Ensure both services are running and on correct ports

---

**Made with ❤️ — RAG Chatbot**
