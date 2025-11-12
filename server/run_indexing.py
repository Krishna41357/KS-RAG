"""
Run this script once to index your 4 PDFs and store embeddings in MongoDB.
"""

from vectorstore import index_documents

if __name__ == "__main__":
    # List your 4 PDF file paths here
    pdf_paths = [
        "uploads/Complete Deep Dive_ Australia.pdf",
        "uploads/Complete Deep Dive_ Canada.pdf",
        "uploads/Complete Deep Dive_ UK.pdf",
        "uploads/Complete Deep Dive_ USA.pdf",
    ]
    
    print("🚀 Starting PDF Indexing Process...")
    print(f"📁 Processing {len(pdf_paths)} PDF files\n")
    
    try:
        total_chunks = index_documents(pdf_paths)
        print(f"\n✅ SUCCESS: Indexed {total_chunks} chunks from {len(pdf_paths)} PDFs")
        print("💡 You can now run your FastAPI app with: python app.py")
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        print("Please check your PDF paths and environment variables.")