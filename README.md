# 🤖KS RAG Chatbot - PDF Question Answering System

A full-stack **Retrieval-Augmented Generation (RAG)** chatbot for uploading PDFs and asking questions about their content. Built with FastAPI, Next.js, MongoDB, Cohere embeddings, and Groq's Llama 3.3 70B.

![RAG Chatbot](https://img.shields.io/badge/RAG-Chatbot-red?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.11-blue?style=for-the-badge&logo=python)
![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js)

## ✨ Features

- 📄 Upload up to 4 PDFs simultaneously with automatic chunking & vector embeddings
- 💬 Context-aware Q&A using semantic search and RAG
- 👤 JWT authentication with secure password hashing
- 🗂️ Multiple chat conversations with auto-generated titles
- 🎨 Modern dark UI with responsive design

## 🚀 Quick Start

### Prerequisites
- Python 3.11+, Node.js 18+, MongoDB
- API Keys: [Cohere](https://dashboard.cohere.com/api-keys) & [Groq](https://console.groq.com/keys)

### Installation

**1. Clone & Setup Backend**
```bash
git clone https://github.com/Krishna41357/KS-RAG.git
cd KS-RAG/server

python -m venv ragbot
source ragbot/bin/activate  # Windows: ragbot\Scripts\activate
pip install -r requirements.txt

# Create .env file
cp .env.example .env
```

**Edit `server/.env`:**
```env
MONGO_URI=mongodb://localhost:27017/rag_database
COHERE_API_KEY=your_cohere_api_key
GROQ_API_KEY=your_groq_api_key
SECRET_KEY=your_secret_key_32_chars_minimum
```

**Start backend:**
```bash
uvicorn main:app --reload --port 9000
```

**2. Setup Frontend**
```bash
cd ../client
npm install

# Create .env.local
cp .env.example .env.local
```

**Edit `client/.env.local`:**
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:9000
```

**Start frontend:**
```bash
npm run dev
```

Visit `http://localhost:3000`

## 📖 Usage

1. **Sign up/Login** at the homepage
2. **Upload PDFs** using the paperclip icon (up to 4 files)
3. **Ask questions** and get AI-powered answers with source citations
4. **Manage chats** from the sidebar

## 🛠️ Tech Stack

**Backend:** FastAPI, MongoDB, PyPDF2, Cohere, Groq, JWT  
**Frontend:** Next.js 16, TypeScript, TailwindCSS, Lucide React

## 🔌 Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users/register` | Register user |
| POST | `/users/login` | Login user |
| POST | `/upload` | Upload PDFs |
| POST | `/chats/{id}/messages` | Send message & get response |
| GET | `/chats` | List user chats |

## 📁 Project Structure

```
KS-RAG/
├── server/              # FastAPI backend
│   ├── main.py         # Entry point
│   ├── vectorstore.py  # PDF processing
│   ├── routes/         # API endpoints
│   └── .env.example
├── client/             # Next.js frontend
│   ├── app/           # Pages
│   ├── components/    # React components
│   └── .env.example
└── README.md
```

## 👨‍💻 Author

**Krishna Srivastava**  
GitHub: [@Krishna41357](https://github.com/Krishna41357)  
Email: krishnasrivastava41357@gmail.com

## 📄 License

MIT License

---

**Built with ❤️ by Krishna Srivastava**
