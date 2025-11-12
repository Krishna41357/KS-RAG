import os
from dotenv import load_dotenv
from pymongo import MongoClient
from numpy import dot
from numpy.linalg import norm
from cohere import Client as CohereClient
from groq import Groq

load_dotenv()
mongo_uri = os.getenv("MONGO_URI")
cohere_api_key = os.getenv("COHERE_API_KEY")
groq_api_key = os.getenv("GROQ_API_KEY")

mongo_client = MongoClient(mongo_uri)
db = mongo_client["rag_database"]
collection = db["documents"]
cohere = CohereClient(cohere_api_key)
groq = Groq(api_key=groq_api_key)


def get_relevant_chunks(query: str, k: int = 4):
    """Find top-k relevant chunks based on cosine similarity with metadata."""
    query_emb = cohere.embed(
        model="embed-english-v3.0",
        texts=[query],
        input_type="search_query"
    ).embeddings[0]

    # Fetch documents with metadata
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

    # Sort by score descending
    scored.sort(reverse=True, key=lambda x: x["score"])
    top_chunks = scored[:k]
    
    return top_chunks


def answer_query(query: str):
    """Generate answer using Groq model based on relevant chunks."""
    top_chunks = get_relevant_chunks(query)

    if not top_chunks:
        return "No relevant context found in the uploaded PDFs.", []

    # Extract just the text for context
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
    
    # Return structured sources with metadata
    sources = [
        {
            "pdf_name": chunk["pdf_name"],
            "page": chunk["page"],
            "score": chunk["score"],
            "snippet": chunk["text"][:300]  # First 300 chars as snippet
        }
        for chunk in top_chunks
    ]
    
    return answer, sources