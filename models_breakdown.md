# 🤖 Breakdown of the 8 Local AI Models

This document outlines the 8 offline AI embedding models stored locally in `D:\AI engine\models` and their assigned roles within the **AI Plagiarism & Similarity Detection Engine**.

---

## 📊 Models Summary Table

| # | Model Folder | Memory Footprint | Primary Domain & Strengths | Assigned Engine Role |
|---|---|---|---|---|
| 1 | **`bge-m3`** | ~2.2 GB RAM | **SOTA Long-Context Multi-Function (BAAI)**<br>Supports long research papers up to **8,192 tokens**, dense & sparse retrieval. | 📄 **Paper & Research Specialist Agent** (Deep semantic matching of long PDFs, theses, and documents) |
| 2 | **`codebert-base`** | ~500 MB RAM | **Bimodal Source Code Model (Microsoft)**<br>Pre-trained on C++, Python, Java, JS, C#, PHP, Go, Rust. Understands code structure & semantics beyond token names. | 💻 **Code Specialist Agent** (Semantic & Structural Code Plagiarism) |
| 3 | **`LaBSE`** | ~1.9 GB RAM | **Language-Agnostic BERT (Google)**<br>Produces dual-aligned embeddings across 109+ languages. Ideal for cross-lingual plagiarism (Arabic ↔ English). | 🌐 **Cross-Lingual Agent** (Arabic ↔ English Translation Alignment) |
| 4 | **`arabertv02`** | ~540 MB RAM | **Specialized Arabic NLP (Aubmindlab)**<br>Understands Arabic morphological structure, diacritics (Tashkeel), root-based words, and formal prose. | 🌙 **Arabic Language Specialist Agent** (Arabic PDF & Document Nuances) |
| 5 | **`multilingual-e5-large`** | ~2.2 GB RAM | **Top MTEB Benchmark Accuracy (Microsoft)**<br>High-precision multi-lingual text embedding model for top-tier similarity ranking. | 🎯 **Precision Reranker Agent** (High-Accuracy Document Scoring) |
| 6 | **`multilingual-e5-base`** | ~1.1 GB RAM | **Balanced Multilingual Embedding (Microsoft)**<br>Balanced speed and accuracy for general multilingual documents. | ⚖️ **General Multilingual Agent** |
| 7 | **`paraphrase-multilingual-MiniLM-L12-v2`** | ~470 MB RAM | **Multilingual Paraphrase Detection (SBERT)**<br>Detects rephrased sentences, synonym substitution, and altered word order. | 🔄 **Paraphrase & Rewriting Detector Agent** |
| 8 | **`all-MiniLM-L6-v2`** | ~90 MB RAM | **Ultra-Fast General Text Baseline**<br>Minimal memory overhead for fast vector index generation and initial candidate filtering. | ⚡ **Fast Triage Agent** (Initial Candidate Filtering) |

---

## 🎯 Task-Based Model Dispatcher Routing Strategy

To maximize efficiency and ensure models are only invoked for relevant tasks:

1. **Code Files** (`.py`, `.cpp`, `.java`, `.js`, `.cs`, `.go`, `.rs`, `.php`, etc.):
   - **Dispatched To**: `codebert-base` + Pygments Token Fingerprinting & Python AST.
   - **Excluded**: Arabic & NLP models are skipped for source code.

2. **Arabic Documents & Papers**:
   - **Dispatched To**: `arabertv02` (for Arabic text semantics) & `LaBSE` (for Arabic-English cross-lingual detection).
   - **Excluded**: CodeBERT is skipped for natural language text.

3. **Long Research Papers & PDFs**:
   - **Dispatched To**: `bge-m3` (8K context window).

4. **Fast General Indexing & Triage**:
   - **Dispatched To**: `all-MiniLM-L6-v2` (Fast candidate retrieval).
