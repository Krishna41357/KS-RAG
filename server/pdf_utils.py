import os
from typing import List, Dict

from pypdf import PdfReader


def pdf_to_pages(path: str) -> List[Dict]:
    """Extract text per page from a PDF and return list of dicts with text and metadata."""
    reader = PdfReader(path)
    pages = []
    for i, page in enumerate(reader.pages):
        try:
            text = page.extract_text() or ""
        except Exception:
            text = ""
        pages.append({"text": text, "page": i + 1, "source": os.path.basename(path)})
    return pages


def chunk_pages(pages: List[Dict], chunk_size: int = 1000, chunk_overlap: int = 200):
    """Chunk page texts into smaller pieces with overlap.

    Returns list of tuples (chunk_text, metadata)
    """
    chunks = []
    for p in pages:
        text = p["text"]
        if not text:
            continue

        # Simple sliding window chunking
        words = text.split()
        for i in range(0, len(words), chunk_size - chunk_overlap):
            chunk_words = words[i : i + chunk_size]
            chunk_text = " ".join(chunk_words)
            if chunk_text.strip():
                metadata = {"source": p["source"], "page": p["page"]}
                chunks.append((chunk_text, metadata))

    return chunks
