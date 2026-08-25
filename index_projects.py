import os
import sys
from pathlib import Path
from typing import List

# Fix Windows console UTF-8 output
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Ensure local package import
sys.path.insert(0, str(Path(__file__).parent))

from plagiarism_engine import (
    FileExtractor,
    CodePlagiarismDetector,
    TextPlagiarismDetector,
    MultilingualVectorStore,
    SystemDBStore
)

def index_and_scan_project_paths(path_list: List[str]):
    """
    Crawls every specified project folder path (located anywhere on disk),
    filters out non-core files (.venv, node_modules, configs),
    indexes them into PostgreSQL and ChromaDB, and performs a pairwise cross-project scan.
    """
    valid_paths = [Path(p.strip()) for p in path_list if p.strip() and Path(p.strip()).exists() and Path(p.strip()).is_dir()]
    
    if not valid_paths:
        print("No valid directory paths provided.")
        return

    print("=" * 80)
    print(f" BATCH INDEXING & SCANNING {len(valid_paths)} PROJECT DIRECTORIES")
    print("=" * 80)

    db = SystemDBStore()
    local_model_path = str(Path(__file__).parent / "all-MiniLM-L6-v2")
    vstore = MultilingualVectorStore(
        collection_name="streamlit_vector_db",
        persist_directory="./chroma_app_db",
        model_name=local_model_path
    )

    all_project_files = {}

    for idx, project_dir in enumerate(valid_paths, 1):
        project_name = project_dir.name
        print(f"\n[{idx}/{len(valid_paths)}] Processing Project: '{project_name}' ({project_dir})...")
        
        extracted_files = FileExtractor.scan_project_directory(project_dir)
        print(f"  -> Extracted {len(extracted_files)} core files (filtered .venv, node_modules, configs).")
        all_project_files[project_name] = extracted_files

        if extracted_files:
            # 1. Save to PostgreSQL
            db.save_project(project_id=project_name, project_name=project_name, files=extracted_files)
            print(f"  -> Saved project record and files into PostgreSQL Database.")

            # 2. Index into ChromaDB
            vstore.index_project_files(project_files=extracted_files, project_id=project_name)
            print(f"  -> Indexed vector embeddings into ChromaDB.")

    # 3. Cross-Project Plagiarism Scan
    print("\n" + "=" * 80)
    print(" CROSS-PROJECT PAIRWISE PLAGIARISM SCAN RESULTS")
    print("=" * 80)

    code_detector = CodePlagiarismDetector(similarity_threshold=0.65)
    proj_names = list(all_project_files.keys())

    for i in range(len(proj_names)):
        p1 = proj_names[i]
        for j in range(i + 1, len(proj_names)):
            p2 = proj_names[j]
            c_matches = code_detector.scan_code_files(all_project_files[p1], all_project_files[p2])
            
            print(f"\n--- Comparing '{p1}' vs '{p2}' ---")
            if c_matches:
                for cm in c_matches:
                    print(f"  🚨 CODE MATCH: {cm['file1']} <--> {cm['file2']} ({cm['similarity_percentage']})")
            else:
                print("  ✅ No high similarity code matches found.")

    print("\n" + "=" * 80)
    print(" PROCESS COMPLETED SUCCESSFULLY")
    print("======================================================================")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        paths = sys.argv[1:]
    else:
        raw_in = input("Enter project folder paths separated by space or comma: ").strip()
        paths = [p.strip() for p in raw_in.replace(',', ' ').split() if p.strip()]
    
    if paths:
        index_and_scan_project_paths(paths)
