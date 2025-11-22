import os
from dotenv import load_dotenv
from pymongo import MongoClient
from numpy import dot
from numpy.linalg import norm

load_dotenv()

# MongoDB setup (this is fine at module level)
mongo_uri = os.getenv("MONGO_URI")
if not mongo_uri:
    raise RuntimeError("MONGO_URI not set!")

mongo_client = MongoClient(mongo_uri)
db = mongo_client["rag_database"]
collection = db["documents"]

# Lazy-initialized clients
_cohere_client = None
_groq_client = None


def get_cohere():
    """Lazy initialization of Cohere client."""
    global _cohere_client
    if _cohere_client is None:
        from cohere import Client as CohereClient
        api_key = os.getenv("COHERE_API_KEY")
        if not api_key:
            raise RuntimeError("COHERE_API_KEY environment variable not set!")
        print(f"DEBUG: Initializing Cohere (key length: {len(api_key)})")
        _cohere_client = CohereClient(api_key)
    return _cohere_client


def get_groq():
    """Lazy initialization of Groq client."""
    global _groq_client
    if _groq_client is None:
        from groq import Groq
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY environment variable not set!")
        print(f"DEBUG: Initializing Groq (key length: {len(api_key)})")
        _groq_client = Groq(api_key=api_key)
    return _groq_client


def get_relevant_chunks(query: str, k: int = 4):
    """Find top-k relevant chunks based on cosine similarity with metadata."""
    cohere = get_cohere()  # Lazy init here
    
    query_emb = cohere.embed(
        model="embed-english-v3.0",
        texts=[query],
        input_type="search_query"
    ).embeddings[0]

    all_docs = list(collection.find({}, {
        "text": 1, 
        "embedding": 1, 
        "pdf_name": 1, 
        "page": 1,
        "chunk_id": 1
    }))
    
    scored = []
    for doc in all_docs:
        score = dot(query_emb, doc["embedding"]) / (norm(query_emb) * norm(doc["embedding"]))
        scored.append({
            "score": float(score),
            "text": doc["text"],
            "pdf_name": doc.get("pdf_name", "Unknown"),
            "page": doc.get("page", "?"),
            "chunk_id": doc.get("chunk_id", "unknown")
        })

    scored.sort(reverse=True, key=lambda x: x["score"])
    return scored[:k]


def answer_query(query: str):
    """Generate answer using Groq model based on relevant chunks."""
    groq = get_groq()  # Lazy init here
    
    top_chunks = get_relevant_chunks(query)

    if not top_chunks:
        return "No relevant context found in the uploaded PDFs.", []

    context = "\n\n".join([chunk["text"] for chunk in top_chunks])
    
    prompt = f"""Based on the following context from the documents, answer the question accurately and concisely.

Context:
{context}

Question: {query}

Answer:"""

    response = groq.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You are a helpful assistant that answers questions based on the provided context. If the answer is not in the context, say so."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
    )

    answer = response.choices[0].message.content
    
    # ⭐ FIX: Map fields to match Pydantic Source model (title, content, url, score)
    sources = [
        {
            "title": f"{chunk['pdf_name']} (Page {chunk['page']})",  # Changed from pdf_name to title
            "content": chunk["text"][:300],  # Changed from snippet to content
            "score": chunk["score"],
            "url": None  # Optional field, set to None if not available
        }
        for chunk in top_chunks
    ]
    
    return answer, sources