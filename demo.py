import os
import sys
from pathlib import Path

# Fix Windows console Unicode output for Arabic text
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
    CodePlagiarismDetector,
    TextPlagiarismDetector,
    MultilingualVectorStore,
    SystemDBStore,
    normalize_arabic_text
)

def print_header(title: str):
    print("\n" + "=" * 70)
    print(f" {title}")
    print("=" * 70)

def main():
    print_header("STANDALONE PRODUCTION-READY AI & PLAGIARISM DETECTION ENGINE")
    print("Engine initialized. Starting multi-module demonstration...\n")

    # ------------------------------------------------------------------
    # DEMO A: ARABIC & ENGLISH NLP TEXT PLAGIARISM CHECK
    # ------------------------------------------------------------------
    print_header("MODULE 3: ARABIC & ENGLISH NLP TEXT PLAGIARISM DETECTOR")
    
    arabic_text_original = (
        "تعد الذكاء الاصطناعي ومعالجة اللغات الطبيعية من أهم التقنيات الحديثة "
        "التي تساهم في تطوير الأنظمة الذكية وتحليل النصوص بفاعلية عالية."
    )
    
    # Text modified with Tashkeel, Tatweel (kashida), Alef variants (أ -> ا), Teh Marbuta (ة -> ه)
    arabic_text_plagiarized = (
        "تُعَدُّ اَلْذَّكَاكُ الإِصْطِنَاعِيُّ وَمُعَالَجَةُ اللُّغَاتِ النَّطَبِيقِيَّةِـ "
        "مِنْ أَهَمِّ الـتَّقْنِيَاتِ الْحَدِيثَةِ الَّتِي تُسَاهِمُ فِي تَطْوِيرِ الأَنْظِمَةِ الذَّكِيَّةِ."
    )

    print("[Original Arabic Text]:")
    print(f"  '{arabic_text_original}'")
    print("\n[Plagiarized Arabic Text (with Tashkeel & Tatweel & Alef variants)]:")
    print(f"  '{arabic_text_plagiarized}'")

    normalized_orig = normalize_arabic_text(arabic_text_original)
    normalized_plag = normalize_arabic_text(arabic_text_plagiarized)

    print("\n[Normalized Original Text]:")
    print(f"  '{normalized_orig}'")
    print("[Normalized Plagiarized Text]:")
    print(f"  '{normalized_plag}'")

    text_detector = TextPlagiarismDetector(similarity_threshold=0.50)
    text_result = text_detector.compare_pair(arabic_text_original, arabic_text_plagiarized)

    print(f"\n-> Arabic Text Similarity Score: {text_result['similarity_percentage']} (Raw: {text_result['similarity']})")
    print(f"-> Threshold: {text_result['threshold'] * 100}% | Plagiarism Flagged: {text_result['is_plagiarized']}")

    # ------------------------------------------------------------------
    # DEMO B: MULTI-LANGUAGE CODE PLAGIARISM CHECK (C++, JAVA, PYTHON)
    # ------------------------------------------------------------------
    print_header("MODULE 2: MULTI-LANGUAGE CODE PLAGIARISM DETECTOR")

    # C++ Code Comparison (Original vs Renamed Variables & Reformatted)
    cpp_code_original = """
    // Original C++ Binary Search implementation
    #include <iostream>
    using namespace std;

    int binarySearch(int arr[], int l, int r, int x) {
        while (l <= r) {
            int m = l + (r - l) / 2;
            if (arr[m] == x) return m;
            if (arr[m] < x) l = m + 1;
            else r = m - 1;
        }
        return -1;
    }
    """

    cpp_code_plagiarized = """
    /* Refactored C++ Code with modified variable names and added comments */
    #include <iostream>
    using namespace std;

    int findTargetIndex(int numbers[], int lowIndex, int highIndex, int targetVal) {
        // Loop until boundary crosses
        while (lowIndex <= highIndex) {
            int middleIndex = lowIndex + (highIndex - lowIndex) / 2;
            if (numbers[middleIndex] == targetVal) {
                return middleIndex;
            }
            if (numbers[middleIndex] < targetVal) {
                lowIndex = middleIndex + 1;
            } else {
                highIndex = middleIndex - 1;
            }
        }
        return -1; // Not found
    }
    """

    code_detector = CodePlagiarismDetector(similarity_threshold=0.65)
    cpp_res = code_detector.compare_code(cpp_code_original, cpp_code_plagiarized, filename1="search.cpp", filename2="target.cpp")

    print("[C++ Code Check Result]:")
    print(f"  Mode: {cpp_res['mode']}")
    print(f"  Tokens Extracted (Code 1): {cpp_res['tokens_count_1']} | Tokens (Code 2): {cpp_res['tokens_count_2']}")
    print(f"  Structural Similarity Ratio: {cpp_res['similarity_percentage']} (Raw: {cpp_res['similarity']})")
    print(f"  Plagiarism Flagged (Threshold >= 65%): {cpp_res['is_plagiarized']}")

    # Python AST vs Token Fingerprint Check
    py_code_orig = """
def calculate_factorial(n):
    if n <= 1:
        return 1
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result
"""

    py_code_renamed = """
# Renamed variables and formatting
def compute_fact(number_value):
    if number_value <= 1:
        return 1
    total_product = 1
    for item in range(2, number_value + 1):
        total_product = total_product * item
    return total_product
"""

    py_ast_res = code_detector.compare_code(py_code_orig, py_code_renamed, filename1="fact1.py", filename2="fact2.py", use_ast=True)

    print("\n[Python Code AST Mode Check Result]:")
    print(f"  Mode: {py_ast_res['mode']}")
    print(f"  AST Structural Similarity Ratio: {py_ast_res['similarity_percentage']} (Raw: {py_ast_res['similarity']})")
    print(f"  Plagiarism Flagged (Threshold >= 65%): {py_ast_res['is_plagiarized']}")

    # ------------------------------------------------------------------
    # DEMO C: MULTILINGUAL VECTOR EMBEDDING & CHROMADB (SEMANTIC SEARCH)
    # ------------------------------------------------------------------
    local_model_path = str(Path(__file__).parent / "all-MiniLM-L6-v2")
    print(f"Loading local offline SentenceTransformer from '{local_model_path}' & ChromaDB...")

    vstore = MultilingualVectorStore(
        collection_name="demo_plagiarism_collection",
        persist_directory="./chroma_demo_db",
        model_name=local_model_path
    )

    # Upsert sample documents in Arabic and English
    vstore.upsert_document(
        doc_id="paper_ar_01",
        text="تطبيقات التعلم العميق في معالجة الصور الطبية وتشخيص الأمراض السرطانية.",
        metadata={"category": "AI Research", "language": "Arabic"}
    )
    vstore.upsert_document(
        doc_id="paper_en_01",
        text="Deep learning applications in medical image analysis and cancer diagnostic systems.",
        metadata={"category": "AI Research", "language": "English"}
    )
    vstore.upsert_document(
        doc_id="paper_en_02",
        text="Quantum computing fundamentals and super-conducting qubit architectures.",
        metadata={"category": "Physics", "language": "English"}
    )

    print("Indexed 3 research documents into ChromaDB.")

    search_query = "استخدام الذكاء الاصطناعي والتعلم العميق في التحليل الطبي والرعاية الصحية"
    print(f"\n[Semantic Query (Arabic)]: '{search_query}'")

    matches = vstore.search_similar_documents(query_text=search_query, top_k=3, threshold=0.60)
    
    print("\n[ChromaDB Vector Search Results]:")
    for match in matches:
        print(f"  - Document ID: {match['doc_id']}")
        print(f"    Similarity Score: {match['similarity_percentage']} (Distance: {match['distance']})")
        print(f"    Language: {match['metadata'].get('language')} | Category: {match['metadata'].get('category')}")
        print(f"    Preview: {match['text_preview']}\n")

    # ------------------------------------------------------------------
    # DEMO D: PROJECT DIRECTORY SCANNER & RELATIONAL DATABASE PERSISTENCE
    # ------------------------------------------------------------------
    print_header("MODULE 1 & DB: PROJECT CRAWLER & RELATIONAL PERSISTENCE")
    
    # Create a mock project directory structure with .venv and node_modules
    mock_project = Path("./sample_project_demo")
    mock_project.mkdir(exist_ok=True)
    (mock_project / ".venv").mkdir(exist_ok=True)
    (mock_project / "node_modules").mkdir(exist_ok=True)
    (mock_project / "__pycache__").mkdir(exist_ok=True)
    (mock_project / "src").mkdir(exist_ok=True)

    # Core project files
    (mock_project / "src" / "main.py").write_text("print('Core application logic')", encoding='utf-8')
    (mock_project / "src" / "utils.cpp").write_text("int add(int a, int b) { return a + b; }", encoding='utf-8')
    (mock_project / "README.md").write_text("# Project Documentation", encoding='utf-8')
    
    # Junk files inside .venv and node_modules that MUST be ignored
    (mock_project / ".venv" / "junk.py").write_text("installed_package = True", encoding='utf-8')
    (mock_project / "node_modules" / "express.js").write_text("module.exports = {}", encoding='utf-8')

    print(f"Scanning mock project directory: '{mock_project}'...")
    core_files = FileExtractor.scan_project_directory(mock_project)

    print(f"Total Core Files Extracted (excluding .venv, node_modules, cache): {len(core_files)}")
    for file_rec in core_files:
        print(f"  - [{file_rec['file_type'].upper()}] {file_rec['relative_path']} ({len(file_rec['content'])} bytes)")

    # Save to System Database
    db = SystemDBStore(sqlite_db_path="./system_demo_db.sqlite")
    db.save_project(project_id="proj_alpha", project_name="Alpha Core Engine", files=core_files)
    print("\nProject and core files successfully saved into Relational System Database.")

    print_header("DEMONSTRATION COMPLETED SUCCESSFULLY")

if __name__ == "__main__":
    main()
