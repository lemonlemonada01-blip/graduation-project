import os
import sys
import time
import threading
from pathlib import Path
import streamlit as st
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI()

_embedding_model = None
_code_model = None
_model_lock = threading.Lock()

def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        with _model_lock:
            if _embedding_model is None:
                from sentence_transformers import SentenceTransformer
                models_dir = os.environ.get('MODELS_DIR', os.path.join(os.path.dirname(__file__), 'models'))
                _embedding_model = SentenceTransformer(os.path.join(models_dir, 'multilingual-e5-large'))
    return _embedding_model

def get_code_model():
    global _code_model
    if _code_model is None:
        with _model_lock:
            if _code_model is None:
                from sentence_transformers import SentenceTransformer
                models_dir = os.environ.get('MODELS_DIR', os.path.join(os.path.dirname(__file__), 'models'))
                _code_model = SentenceTransformer(os.path.join(models_dir, 'codebert-base'))
    return _code_model

def _preload_models():
    """Preload models in background so they're ready when first needed."""
    get_embedding_model()
    get_code_model()

@app.on_event('startup')
async def startup():
    # Start model preloading in background thread
    thread = threading.Thread(target=_preload_models, daemon=True)
    thread.start()

@app.get('/api/system/ready')
async def readiness():
    return {
        'ready': _embedding_model is not None and _code_model is not None,
        'models': {
            'embedding': _embedding_model is not None,
            'code_embedding': _code_model is not None,
        }
    }

@app.get('/api/plagiarism/projects/check')
async def check_projects(names: str):
    """Check if projects with given names already exist."""
    name_list = [n.strip() for n in names.split(',')]
    db = get_db()
    existing = db.check_project_exists(name_list)
    return {'existing': existing}

@app.get('/api/scan/stream')
async def scan_stream():
    async def event_generator():
        start_time = time.time()
        last_log_time = time.time()
        # Simulated scan loop
        for i in range(100):
            if time.time() - last_log_time > 3:
                yield f"data: {{\"type\": \"heartbeat\", \"elapsed\": {int(time.time() - start_time)}}}\n\n"
                last_log_time = time.time()
            time.sleep(0.1)
    return StreamingResponse(event_generator(), media_type="text/event-stream")

# Configure page header and layout
st.set_page_config(
    page_title="AI Plagiarism & Similarity Engine",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

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

# Custom CSS styling with clean line-by-line monospace console
st.markdown("""
    <style>
    .main-title { font-size: 2.3rem; font-weight: 700; color: #1E88E5; margin-bottom: 0.2rem; }
    .sub-title { font-size: 1.1rem; color: #555555; margin-bottom: 1.5rem; }
    .metric-card { background-color: #f8f9fa; border-radius: 8px; padding: 15px; border-left: 5px solid #1E88E5; }
    .flagged-card { background-color: #ffebee; border-radius: 8px; padding: 15px; border-left: 5px solid #e53935; }
    .safe-card { background-color: #e8f5e9; border-radius: 8px; padding: 15px; border-left: 5px solid #43a047; }
    .log-box { 
        background-color: #1e1e1e; 
        color: #00ff66; 
        font-family: 'Courier New', Courier, monospace; 
        font-size: 0.85rem; 
        line-height: 1.4;
        white-space: pre-wrap; 
        padding: 14px; 
        border-radius: 6px; 
        height: 280px; 
        overflow-y: auto; 
        border: 1px solid #333; 
    }
    </style>
""", unsafe_allow_html=True)

# Cache heavy instances
@st.cache_resource
def get_db():
    return SystemDBStore()

@st.cache_resource
def get_vector_store():
    return MultilingualVectorStore(
        collection_name="streamlit_vector_db",
        persist_directory="./chroma_app_db"
    )

def main():
    st.markdown('<div class="main-title">🛡️ AI Plagiarism & Similarity Detection Engine</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-title">Production-grade Multilingual NLP & Multi-Language Code Scanner with PostgreSQL & ChromaDB</div>', unsafe_allow_html=True)

    db = get_db()
    vstore = get_vector_store()

    # Sidebar Navigation
    st.sidebar.title("Engine Navigation")
    menu = st.sidebar.radio(
        "Select Module:",
        [
            "📁 Multi-Project Indexer & Scanner",
            "🤖 Local Models & PC Hardware Analysis",
            "📄 Document & Paper Scanner",
            "💻 Code Plagiarism Scanner",
            "🐘 PostgreSQL & Model Manager"
        ]
    )

    st.sidebar.markdown("---")
    st.sidebar.markdown("### Active Configuration")
    st.sidebar.info(f"**Database**: PostgreSQL (`localhost:5432`)\n\n**Mode**: {db.mode.upper()}\n\n**Active Dispatcher**: Task-Based Lazy Pool\n\n**Code Model**: `codebert-base`\n\n**Doc Ensemble**: `bge-m3` + `LaBSE` + `arabertv02`")

    # ------------------------------------------------------------------
    # TAB 1: MULTI-PROJECT INDEXER & SCANNER (REAL-TIME LOGGING)
    # ------------------------------------------------------------------
    if menu == "📁 Multi-Project Indexer & Scanner":
        st.header("📁 Multi-Project Folder Indexer & Real-Time Task Dispatcher")
        st.write("Crawl disk folders or run an **Instant Cross-Scan from PostgreSQL** without re-crawling. Uses `codebert-base` for code and the **Multilingual Ensemble** (`bge-m3` + `LaBSE` + `arabertv02`) for text documents.")

        default_paths = os.environ.get("DEFAULT_SCAN_PATHS", "./\n")

        paths_input = st.text_area(
            "Enter Project Directory Paths (One path per line):",
            height=240,
            value=default_paths
        )

        col_opts1, col_opts2 = st.columns(2)
        with col_opts1:
            code_thresh = st.slider("Code Similarity Threshold (%)", min_value=40, max_value=95, value=65, step=5) / 100.0
        with col_opts2:
            text_thresh = st.slider("Text Similarity Threshold (%)", min_value=30, max_value=90, value=50, step=5) / 100.0

        st.markdown("---")
        st.subheader("⚡ PostgreSQL Instant Cross-Scan (Search & Select)")
        db_projects_raw = db.get_all_projects()
        db_project_names = [p['id'] for p in db_projects_raw]
        
        selected_db_projects = st.multiselect(
            "Select Projects to Cross-Scan (Search by typing here):",
            options=db_project_names,
            default=db_project_names
        )

        col_btn1, col_btn2 = st.columns(2)
        with col_btn1:
            run_disk_scan = st.button("🚀 Index & Scan From Disk (Full Crawl)", type="primary", use_container_width=True)
        with col_btn2:
            run_db_scan = st.button("⚡ Run Instant Cross-Scan on Selected Projects", type="secondary", use_container_width=True)

        if "scan_completed" not in st.session_state:
            st.session_state.scan_completed = False
            st.session_state.code_matches = []
            st.session_state.text_matches = []
            st.session_state.log_lines = []

        if run_disk_scan or run_db_scan:
            st.session_state.scan_completed = False
            st.session_state.code_matches = []
            st.session_state.text_matches = []
            st.session_state.log_lines = []
            
            raw_paths = [p.strip() for p in paths_input.splitlines() if p.strip()]
            valid_paths = [Path(p) for p in raw_paths if Path(p).exists() and Path(p).is_dir()]

            # Real-Time UI Log Console setup
            st.markdown("### 📜 Real-Time Task Dispatcher & Execution Console")
            log_placeholder = st.empty()

            def add_log(msg: str):
                timestamp = time.strftime("%H:%M:%S")
                st.session_state.log_lines.append(f"[{timestamp}] {msg}")
                # Clean line-by-line display with \n line breaks
                display_text = "\n".join(st.session_state.log_lines)
                log_placeholder.markdown(
                    f'<div class="log-box">{display_text.replace("<", "&lt;").replace(">", "&gt;")}</div>', 
                    unsafe_allow_html=True
                )

            all_new_project_files = {}

            if run_disk_scan:
                add_log(f"Starting Disk Crawler for {len(valid_paths)} project directories...")
                total_extracted = 0
                progress_bar = st.progress(0)

                for idx, path_obj in enumerate(valid_paths, 1):
                    add_log(f"📁 [{idx}/{len(valid_paths)}] Crawling directory: '{path_obj.name}'...")
                    try:
                        extracted_files = FileExtractor.scan_project_directory(path_obj)
                        total_extracted += len(extracted_files)
                        all_new_project_files[path_obj.name] = extracted_files
                        add_log(f"   -> Extracted {len(extracted_files)} core files (filtered READMEs, init, binaries).")

                        if extracted_files:
                            # 1. Save to PostgreSQL
                            add_log(f"   🐘 Saving '{path_obj.name}' ({len(extracted_files)} files) to PostgreSQL...")
                            db.save_project(project_id=path_obj.name, project_name=path_obj.name, files=extracted_files)

                            # 2. Index into ChromaDB
                            add_log(f"   🔮 Dispatching to vector store...")
                            vstore.index_project_files(project_files=extracted_files, project_id=path_obj.name, log_callback=add_log)

                    except Exception as e:
                        add_log(f"   ⚠️ Warning on '{path_obj.name}': {e}")

                    progress_bar.progress(idx / len(valid_paths))

                add_log(f"🎉 Disk indexing complete! Total core files: {total_extracted}.")
                st.success(f"Successfully processed & indexed {len(valid_paths)} projects ({total_extracted} core files) into PostgreSQL and ChromaDB!")

            elif run_db_scan:
                if not selected_db_projects:
                    st.warning("Please select at least one project from the dropdown above.")
                    st.stop()
                    
                add_log(f"⚡ Fetching {len(selected_db_projects)} selected projects directly from PostgreSQL Database...")
                db_projects = [p for p in db.get_all_projects() if p['id'] in selected_db_projects]
                add_log(f"   -> Retrieved {len(db_projects)} projects from PostgreSQL.")

                conn = db._get_connection()
                cur = conn.cursor()

                for proj in db_projects:
                    pid = proj['id']
                    if db.mode == 'postgresql':
                        cur.execute("SELECT relative_path, file_type, content FROM project_files WHERE project_id = %s;", (pid,))
                    else:
                        cur.execute("SELECT relative_path, file_type, content FROM project_files WHERE project_id = ?;", (pid,))
                    
                    rows = cur.fetchall()
                    files = []
                    for r in rows:
                        if isinstance(r, dict) or hasattr(r, 'keys'):
                            r_dict = dict(r)
                            files.append({
                                "relative_path": r_dict['relative_path'],
                                "filename": Path(r_dict['relative_path']).name,
                                "extension": Path(r_dict['relative_path']).suffix.lower(),
                                "file_type": r_dict['file_type'],
                                "content": r_dict['content']
                            })
                        else:
                            files.append({
                                "relative_path": r[0],
                                "filename": Path(r[0]).name,
                                "extension": Path(r[0]).suffix.lower(),
                                "file_type": r[1],
                                "content": r[2]
                            })
                    all_new_project_files[pid] = files
                    add_log(f"   -> Loaded '{pid}' ({len(files)} files) from PostgreSQL.")

                conn.close()
                st.success(f"Loaded {len(all_new_project_files)} projects directly from PostgreSQL for instant cross-scanning!")

            # ------------------------------------------------------------------
            # OPTIMIZED PAIRWISE CROSS-PROJECT SCAN
            # ------------------------------------------------------------------
            st.markdown("---")
            st.subheader("🔍 Pairwise Cross-Project Plagiarism Scan Results")

            code_detector = CodePlagiarismDetector(similarity_threshold=code_thresh)
            text_detector = TextPlagiarismDetector(similarity_threshold=text_thresh)

            proj_names = list(all_new_project_files.keys())
            code_matches = []
            text_matches = []

            total_pairs = (len(proj_names) * (len(proj_names) - 1)) // 2
            pair_idx = 0
            
            scan_progress = st.progress(0)
            add_log(f"Starting optimized cross-scan across {total_pairs} project pairs...")

            for i in range(len(proj_names)):
                p1_name = proj_names[i]
                p1_files = all_new_project_files[p1_name]

                for j in range(i + 1, len(proj_names)):
                    p2_name = proj_names[j]
                    p2_files = all_new_project_files[p2_name]
                    pair_idx += 1

                    add_log(f"🔍 [{pair_idx}/{total_pairs}] Cross-Scanning '{p1_name}' vs '{p2_name}'...")

                    # Fast Code scan (extension filtered + token capped)
                    def code_log_cb(msg):
                        add_log(msg)
                    c_matches = code_detector.scan_code_files(p1_files, p2_files, progress_callback=code_log_cb)
                    if c_matches:
                        add_log(f"   🚨 Flagged {len(c_matches)} code plagiarism matches between '{p1_name}' and '{p2_name}'.")
                    for cm in c_matches:
                        cm['project1'] = p1_name
                        cm['project2'] = p2_name
                        st.session_state.code_matches.append(cm)

                    # Text scan (mixed Arabic/English)
                    p1_text_docs = [f for f in p1_files if f['file_type'] == 'text']
                    p2_text_docs = [f for f in p2_files if f['file_type'] == 'text']
                    
                    t_matches = text_detector.scan_text_files(p1_text_docs, p2_text_docs)
                    if t_matches:
                        add_log(f"   🚨 Flagged {len(t_matches)} text document plagiarism matches between '{p1_name}' and '{p2_name}'.")
                    for tm in t_matches:
                        tm['project1'] = p1_name
                        tm['project2'] = p2_name
                        st.session_state.text_matches.append(tm)

                    if total_pairs > 0:
                        scan_progress.progress(pair_idx / total_pairs)

            add_log(f"✅ Pairwise cross-project scan completed. Found {len(st.session_state.code_matches)} code matches and {len(st.session_state.text_matches)} document matches.")
            st.session_state.scan_completed = True

        if st.session_state.scan_completed:
            # Full Log Copying & Download Section
            st.markdown("### 📋 Copy / Download Complete Execution Log")
            full_log_str = "\n".join(st.session_state.log_lines)
            st.download_button(
                label="📥 Download Complete Log File (.txt)",
                data=full_log_str,
                file_name=f"plagiarism_scan_log_{int(time.time())}.txt",
                mime="text/plain"
            )
            with st.expander("👁️ View & Copy Un-truncated Log (From Line #1 to End)", expanded=False):
                st.code(full_log_str, language="text")

            # Display Match Tables
            st.markdown("### Code Plagiarism Matches")
            if st.session_state.code_matches:
                st.dataframe(st.session_state.code_matches, use_container_width=True)
            else:
                st.info("No code plagiarism matches found above threshold.")

            st.markdown("### Text Document Plagiarism Matches")
            if st.session_state.text_matches:
                st.dataframe(st.session_state.text_matches, use_container_width=True)
            else:
                st.info("No text document plagiarism matches found above threshold.")

    # ------------------------------------------------------------------
    # TAB 2: LOCAL MODELS & PC HARDWARE ANALYSIS
    # ------------------------------------------------------------------
    elif menu == "🤖 Local Models & PC Hardware Analysis":
        st.header("🤖 Local AI Models Breakdown & PC Capability Assessment")
        st.write("Detailed breakdown of all **8 offline AI models** in `D:\\AI engine\\models` and your PC hardware capacity for multi-model agentic workflows.")

        st.subheader("🖥️ PC Hardware Assessment & Memory Footprint")
        h_col1, h_col2, h_col3 = st.columns(3)
        h_col1.metric("System RAM", "16.0 GB RAM", delta="Sufficient for Multi-Agent Workflow")
        h_col2.metric("CPU Processor", "Multi-Core CPU", delta="Parallel Multiprocessing Ready")
        h_col3.metric("Max Concurrent Models RAM", "~9.0 GB RAM", delta="7.0 GB Headroom Remaining")

        st.success("✅ **PC Capability Result**: Your 16 GB RAM system is fully capable of executing an **Agentic Workflow** running specialized models concurrently (e.g. `bge-m3` for papers + `codebert-base` for code + `LaBSE` for cross-lingual Arabic/English).")

        st.markdown("---")
        st.subheader("📚 Breakdown of the 8 Local AI Models in `D:\\AI engine\\models`")

        models_info = [
            {
                "Model Folder": "all-MiniLM-L6-v2",
                "Role / Domain": "Fast Baseline General Text Embedding",
                "Size / RAM": "~90 MB RAM",
                "Best Use Case": "Ultra-fast text & document similarity search across large file indexes.",
                "Agentic Role": "⚡ Fast Triage Agent (Initial Candidate Filtering)"
            },
            {
                "Model Folder": "bge-m3",
                "Role / Domain": "SOTA Long-Context Multi-Function Model (BAAI)",
                "Size / RAM": "~2.2 GB RAM",
                "Best Use Case": "Long research papers up to 8,192 tokens; multi-granularity dense & sparse retrieval.",
                "Agentic Role": "📄 Paper Specialist Agent (Deep Document & Paper Matching)"
            },
            {
                "Model Folder": "codebert-base",
                "Role / Domain": "Bimodal Source Code Representation (Microsoft)",
                "Size / RAM": "~500 MB RAM",
                "Best Use Case": "Source code semantic matching across C++, Python, Java, JS, C#, PHP.",
                "Agentic Role": "💻 Code Specialist Agent (Semantic & Structural Code Plagiarism)"
            },
            {
                "Model Folder": "LaBSE",
                "Role / Domain": "Language-Agnostic BERT Sentence Embeddings (Google)",
                "Size / RAM": "~1.9 GB RAM",
                "Best Use Case": "Cross-lingual similarity matching (e.g., Arabic paper translated to English or vice versa).",
                "Agentic Role": "🌐 Cross-Lingual Translation Agent (Arabic ↔ English Alignment)"
            },
            {
                "Model Folder": "arabertv02",
                "Role / Domain": "Specialized Arabic Language Model (Aubmindlab)",
                "Size / RAM": "~540 MB RAM",
                "Best Use Case": "Deep Arabic text analysis, diacritics (Tashkeel) handling, and Arabic document semantics.",
                "Agentic Role": "🌙 Arabic NLP Specialist Agent (Arabic Document Nuances)"
            },
            {
                "Model Folder": "multilingual-e5-large",
                "Role / Domain": "Top MTEB Benchmark Multilingual Embedding (Microsoft)",
                "Size / RAM": "~2.2 GB RAM",
                "Best Use Case": "Highest precision multilingual text similarity search.",
                "Agentic Role": "🎯 Precision Reranker Agent (High-Accuracy Document Scoring)"
            },
            {
                "Model Folder": "multilingual-e5-base",
                "Role / Domain": "Balanced Multilingual Embedding Model (Microsoft)",
                "Size / RAM": "~1.1 GB RAM",
                "Best Use Case": "Balanced speed and accuracy for multilingual text documents.",
                "Agentic Role": "⚖️ General Multilingual Agent"
            },
            {
                "Model Folder": "paraphrase-multilingual-MiniLM-L12-v2",
                "Role / Domain": "Multilingual Paraphrase Detection (SBERT)",
                "Size / RAM": "~470 MB RAM",
                "Best Use Case": "Detecting rephrased or paraphrased sentences across 50+ languages.",
                "Agentic Role": "🔄 Paraphrase & Rewriting Detector Agent"
            }
        ]

        st.table(models_info)

    # ------------------------------------------------------------------
    # TAB 3: DOCUMENT & PAPER SCANNER
    # ------------------------------------------------------------------
    elif menu == "📄 Document & Paper Scanner":
        st.header("📄 Arabic & English NLP Document Scanner")
        st.write("Calculates Weighted Composite Plagiarism Scores: **30% Title + 30% Keywords + 40% Text Body**.")

        col1, col2 = st.columns(2)
        with col1:
            st.subheader("Document 1 (Original / Reference)")
            d1_title = st.text_input("Document 1 Title (Optional)", value="", key="d1_title")
            d1_text = st.text_area("Paste Text or Upload File", height=250, key="d1_text", 
                                  value="تعد الذكاء الاصطناعي ومعالجة اللغات الطبيعية من أهم التقنيات الحديثة التي تساهم في تطوير الأنظمة الذكية.")
            file1 = st.file_uploader("Or Upload Doc 1 (.pdf, .docx, .md, .txt)", type=['pdf', 'docx', 'md', 'txt'], key="f1")
            if file1:
                temp_path = Path("./temp_f1" + Path(file1.name).suffix)
                try:
                    temp_path.write_bytes(file1.read())
                    rec = FileExtractor.extract_file(temp_path)
                    d1_text = rec['content']
                finally:
                    if temp_path.exists(): temp_path.unlink()

        with col2:
            st.subheader("Document 2 (Target / Uploaded)")
            d2_title = st.text_input("Document 2 Title (Optional)", value="", key="d2_title")
            d2_text = st.text_area("Paste Text or Upload File", height=250, key="d2_text",
                                  value="تُعَدُّ اَلْذَّكَاكُ الإِصْطِنَاعِيُّ وَمُعَالَجَةُ اللُّغَاتِ النَّطَبِيقِيَّةِـ مِنْ أَهَمِّ الـتَّقْنِيَاتِ الْحَدِيثَةِ.")
            file2 = st.file_uploader("Or Upload Doc 2 (.pdf, .docx, .md, .txt)", type=['pdf', 'docx', 'md', 'txt'], key="f2")
            if file2:
                temp_path = Path("./temp_f2" + Path(file2.name).suffix)
                try:
                    temp_path.write_bytes(file2.read())
                    rec = FileExtractor.extract_file(temp_path)
                    d2_text = rec['content']
                finally:
                    if temp_path.exists(): temp_path.unlink()

        threshold = st.slider("Similarity Flag Threshold (%)", min_value=30, max_value=90, value=50, step=5) / 100.0

        if st.button("🔍 Execute Plagiarism Check", type="primary"):
            if not d1_text.strip() or not d2_text.strip():
                st.warning("Please provide text for both documents.")
            else:
                detector = TextPlagiarismDetector(similarity_threshold=threshold)
                res = detector.compare_pair(d1_text, d2_text, title1=d1_title, title2=d2_title)

                st.markdown("---")
                st.subheader("Analysis & Score Results")

                m_col1, m_col2, m_col3, m_col4 = st.columns(4)
                m_col1.metric("Overall Score", res['similarity_percentage'])
                m_col2.metric("Title Similarity", f"{round(res['title_score']*100, 2)}%")
                m_col3.metric("Keyword Overlap", f"{round(res['keyword_score']*100, 2)}%")
                m_col4.metric("Text Body Score", f"{round(res['body_score']*100, 2)}%")

                if res['is_plagiarized']:
                    st.markdown(f'<div class="flagged-card">🚨 <b>PLAGIARISM FLAGGED</b>: Similarity score ({res["similarity_percentage"]}) exceeds threshold ({int(threshold*100)}%).</div>', unsafe_allow_html=True)
                else:
                    st.markdown(f'<div class="safe-card">✅ <b>SAFE / PASS</b>: Similarity score ({res["similarity_percentage"]}) is below threshold ({int(threshold*100)}%).</div>', unsafe_allow_html=True)

                st.markdown("### Automatically Extracted Keywords")
                k_col1, k_col2 = st.columns(2)
                k_col1.write(f"**Doc 1 Keywords**: `{', '.join(res['keywords_doc1'][:8])}`")
                k_col2.write(f"**Doc 2 Keywords**: `{', '.join(res['keywords_doc2'][:8])}`")

                db.save_scan_report(
                    report_id=f"scan_{os.urandom(4).hex()}",
                    query_id=d1_title or "Doc1",
                    target_id=d2_title or "Doc2",
                    score=res['similarity'],
                    match_type="NLP_Text",
                    details=f"Title: {res['title_score']}, Keywords: {res['keyword_score']}, Body: {res['body_score']}"
                )
                st.success("Scan audit report recorded in PostgreSQL Database.")

    # ------------------------------------------------------------------
    # TAB 4: CODE PLAGIARISM SCANNER
    # ------------------------------------------------------------------
    elif menu == "💻 Code Plagiarism Scanner":
        st.header("💻 Multi-Language Code Plagiarism Scanner")
        st.write("Supports Pygments Token Structural Fingerprinting (C++, Java, JS, TS, Python, Go, Rust, PHP) & Python AST Mode.")

        c_col1, c_col2 = st.columns(2)
        with c_col1:
            lang1 = st.selectbox("Code 1 File Type", [".cpp", ".py", ".java", ".js", ".ts", ".cs", ".go", ".rs", ".php", ".html", ".css"], index=0)
            code1 = st.text_area("Code Snippet 1", height=250, value="int binarySearch(int arr[], int l, int r, int x) {\n    while (l <= r) {\n        int m = l + (r - l) / 2;\n        if (arr[m] == x) return m;\n        if (arr[m] < x) l = m + 1;\n        else r = m - 1;\n    }\n    return -1;\n}")

        with c_col2:
            lang2 = st.selectbox("Code 2 File Type", [".cpp", ".py", ".java", ".js", ".ts", ".cs", ".go", ".rs", ".php", ".html", ".css"], index=0)
            code2 = st.text_area("Code Snippet 2", height=250, value="int findTargetIndex(int numbers[], int lowIndex, int highIndex, int targetVal) {\n    while (lowIndex <= highIndex) {\n        int middleIndex = lowIndex + (highIndex - lowIndex) / 2;\n        if (numbers[middleIndex] == targetVal) return middleIndex;\n        if (numbers[middleIndex] < targetVal) lowIndex = middleIndex + 1;\n        else highIndex = middleIndex - 1;\n    }\n    return -1;\n}")

        use_ast = st.checkbox("Use Python AST Mode (Only for Python files)", value=False)
        code_threshold = st.slider("Code Similarity Threshold (%)", min_value=40, max_value=95, value=65, step=5) / 100.0

        if st.button("💻 Analyze Code Similarity", type="primary"):
            detector = CodePlagiarismDetector(similarity_threshold=code_threshold)
            res = detector.compare_code(code1, code2, filename1=f"file1{lang1}", filename2=f"file2{lang2}", use_ast=use_ast)

            st.markdown("---")
            st.subheader("Code Structure Results")
            st.metric("Structural Similarity Ratio", res['similarity_percentage'])
            st.write(f"**Analysis Mode**: `{res['mode']}` | **Tokens**: Code 1 ({res['tokens_count_1']}), Code 2 ({res['tokens_count_2']})")

            if res['is_plagiarized']:
                st.markdown(f'<div class="flagged-card">🚨 <b>CODE PLAGIARISM FLAGGED</b>: Code structural similarity ({res["similarity_percentage"]}) exceeds threshold ({int(code_threshold*100)}%).</div>', unsafe_allow_html=True)
            else:
                st.markdown(f'<div class="safe-card">✅ <b>SAFE CODE</b>: Structural similarity ({res["similarity_percentage"]}) is below threshold.</div>', unsafe_allow_html=True)

    # ------------------------------------------------------------------
    # TAB 5: POSTGRESQL & MODEL MANAGER
    # ------------------------------------------------------------------
    elif menu == "🐘 PostgreSQL & Model Manager":
        st.header("🐘 PostgreSQL Database & AI Model Settings")

        st.subheader("PostgreSQL Database Status")
        st.code(f"Connection URL: postgresql://postgres:postgres@localhost:5432/plagiarism_engine_db\nActive Storage Mode: {db.mode.upper()}", language="bash")

        papers = db.get_all_papers()
        projects = db.get_all_projects()

        st.write(f"**Stored Research Papers**: `{len(papers)}` | **Cataloged Projects**: `{len(projects)}`")

        if papers:
            st.markdown("#### Stored Papers in PostgreSQL")
            st.dataframe(papers, use_container_width=True)

        if projects:
            st.markdown("#### Stored Projects in PostgreSQL")
            st.dataframe(projects, use_container_width=True)

        st.markdown("---")
        st.subheader("AI Vector Embedding Model Selection")
        model_choice = st.selectbox(
            "Select Active Offline Embedding Model:",
            [
                "D:/AI engine/models/codebert-base (Source Code Bimodal)",
                "D:/AI engine/models/bge-m3 (SOTA Long Context 8K)",
                "D:/AI engine/models/LaBSE (Cross-Lingual Arabic-English)",
                "D:/AI engine/models/arabertv02 (Arabic Language Specialist)",
                "D:/AI engine/models/multilingual-e5-large (Top Precision)",
                "D:/AI engine/models/multilingual-e5-base (Balanced)",
                "D:/AI engine/models/paraphrase-multilingual-MiniLM-L12-v2 (Paraphrase)",
                "D:/AI engine/models/all-MiniLM-L6-v2 (Lightweight Baseline)"
            ],
            index=0
        )
        st.info(f"Selected Model Path: `{model_choice}`")

if __name__ == "__main__":
    main()
