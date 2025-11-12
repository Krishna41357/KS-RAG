import os
from typing import List, Tuple
from dotenv import load_dotenv
from pymongo import MongoClient
from cohere import Client
from PyPDF2 import PdfReader

load_dotenv()
mongo_uri = os.getenv("MONGO_URI")
cohere_api_key = os.getenv("COHERE_API_KEY")

if not mongo_uri:
    raise ValueError("❌ MONGO_URI not found in .env")
if not cohere_api_key:
    raise ValueError("❌ COHERE_API_KEY not found in .env")

client = MongoClient(mongo_uri)
db = client["rag_database"]
collection = db["documents"]
cohere = Client(cohere_api_key)


def extract_text_from_pdfs(pdf_paths: List[str]) -> List[dict]:
    """Extract and chunk text from PDFs with metadata."""
    chunks = []
    for path in pdf_paths:
        pdf_name = os.path.basename(path)
        reader = PdfReader(path)
        
        for page_num, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            if not text.strip():
                continue
                
            # Chunk the page text
            chunk_size = 1000
            page_chunks = [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]
            
            for chunk_idx, chunk in enumerate(page_chunks):
                chunks.append({
                    "text": chunk,
                    "pdf_name": pdf_name,
                    "page": page_num,
                    "chunk_id": f"{pdf_name}_p{page_num}_c{chunk_idx}"
                })
    
    return chunks


def create_vector_embeddings(chunks: List[dict]) -> List[dict]:
    """Generate vector embeddings for chunks using Cohere."""
    if not chunks:
        return []
    
    texts = [chunk["text"] for chunk in chunks]
    response = cohere.embed(texts=texts, model="embed-english-v3.0", input_type="search_document")
    embeddings = response.embeddings
    
    # Add embeddings to chunk metadata
    for chunk, emb in zip(chunks, embeddings):
        chunk["embedding"] = emb
    
    return chunks


def store_embeddings(chunks_with_embeddings: List[dict]):
    """Store chunks and embeddings in MongoDB."""
    if chunks_with_embeddings:
        collection.insert_many(chunks_with_embeddings)


def index_documents(pdf_paths: List[str]) -> int:
    """Extract text, create embeddings, and store them."""
    chunks = extract_text_from_pdfs(pdf_paths)
    print(f"📄 Extracted {len(chunks)} chunks from PDFs.")

    chunk_embeddings = create_vector_embeddings(chunks)
    store_embeddings(chunk_embeddings)
    print("✅ Stored embeddings in MongoDB.")
    return len(chunk_embeddings)

