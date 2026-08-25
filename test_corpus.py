import os
import sys
from pathlib import Path
from typing import List, Dict, Any

# Ensure UTF-8 stdout encoding for Windows console
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Ensure local package import
sys.path.insert(0, str(Path(__file__).parent))

from plagiarism_engine import (
    FileExtractor,
    TextPlagiarismDetector,
    MultilingualVectorStore,
    SystemDBStore,
    normalize_arabic_text
)

def main():
    target_dir = Path(r"D:\AI engine\test folder")
    print("=" * 80)
    print(f" TESTING PLAGIARISM & SIMILARITY ENGINE ON: '{target_dir}'")
    print("=" * 80)

    # 1. Scan directory and subdirectories (e.g. references)
    print("\n[Step 1]: Extracting text from PDF and MD files...")
    extracted_files = FileExtractor.scan_project_directory(target_dir)
    
    print(f"Total Extracted Documents: {len(extracted_files)}\n")
    for idx, f in enumerate(extracted_files, 1):
        print(f"  {idx:2d}. [{f['file_type'].upper()}] {f['relative_path']} (Ext: {f['extension']}, Size: {len(f['content'])} chars)")

    if not extracted_files:
        print("No documents found to test.")
        return

    # Prepare document objects for batch text detector
    documents_corpus = []
    for f in extracted_files:
        documents_corpus.append({
            "id": f['relative_path'],
            "filename": f['filename'],
            "content": f['content']
        })

    # 2. Compute TF-IDF & Arabic/English Normalized Similarity
    print("\n" + "=" * 80)
    print(" [Step 2]: TF-IDF & Arabic/English NLP Pairwise Similarity Matrix")
    print("=" * 80)

    text_detector = TextPlagiarismDetector(similarity_threshold=0.40)
    all_pairwise_results = text_detector.batch_compare(documents_corpus, threshold=0.10)

    print(f"\nTop 15 Most Similar Document Pairs (TF-IDF & Normalized NLP):")
    print("-" * 80)
    print(f"{'Doc 1':<35} | {'Doc 2':<35} | {'Similarity'}")
    print("-" * 80)

    flagged_count = 0
    for res in all_pairwise_results[:20]:
        doc1 = res['doc1_id']
        doc2 = res['doc2_id']
        score_pct = res['similarity_percentage']
        score = res['similarity']
        
        # Format display name truncation
        d1_str = (doc1[:32] + '...') if len(doc1) > 35 else doc1
        d2_str = (doc2[:32] + '...') if len(doc2) > 35 else doc2
        
        flag_str = " [FLAGGED >= 50%]" if score >= 0.50 else ""
        if score >= 0.50:
            flagged_count += 1
            
        print(f"{d1_str:<35} | {d2_str:<35} | {score_pct:<7}{flag_str}")

    print("-" * 80)
    print(f"Total High Similarity Matches Flagged (>= 50%): {flagged_count}")

    # 3. Vector Embeddings & ChromaDB Semantic Search
    print("\n" + "=" * 80)
    print(" [Step 3]: ChromaDB Vector Store & Semantic Embeddings (Offline Model)")
    print("=" * 80)

    local_model_path = str(Path(__file__).parent / "all-MiniLM-L6-v2")
    vstore = MultilingualVectorStore(
        collection_name="test_folder_collection",
        persist_directory="./chroma_test_folder_db",
        model_name=local_model_path
    )

    print("Indexing documents into ChromaDB...")
    for doc in documents_corpus:
        vstore.upsert_document(
            doc_id=doc['id'],
            text=doc['content'],
            metadata={"filename": doc['filename']}
        )
    print(f"Successfully indexed {len(documents_corpus)} documents in ChromaDB.")

    # Perform semantic query tests against the corpus
    test_queries = [
        "Arabic Extended Proposal proposal for FEPRH system",
        "System architecture diagram and database schema",
        "Role Based Access Control RBAC Auth0 Casbin"
    ]

    for q in test_queries:
        print(f"\n[Semantic Query]: '{q}'")
        matches = vstore.search_similar_documents(query_text=q, top_k=3, threshold=0.30)
        for m in matches:
            print(f"  -> Match: {m['doc_id']:<35} | Similarity: {m['similarity_percentage']}")

    # 4. Save to Database
    db = SystemDBStore(sqlite_db_path="./test_folder_db.sqlite")
    db.save_project(project_id="test_folder_corpus", project_name="Test Folder Corpus", files=extracted_files)
    print("\n[Step 4]: All documents and metadata saved to System Database.")

    print("\n" + "=" * 80)
    print(" TEST COMPLETED SUCCESSFULLY")
    print("=" * 80)

if __name__ == "__main__":
    main()
