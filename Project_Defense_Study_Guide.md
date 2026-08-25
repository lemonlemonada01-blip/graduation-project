# Graduation Project Defense Study Guide: Secure-FEPRH

This guide is designed to help you understand every part of the system we built, exactly how it works under the hood, and how to answer the toughest questions your graduation jury might ask.

---

## 1. System Overview (The "Elevator Pitch")
**What is this project?**
Secure-FEPRH is an enterprise-grade, AI-powered academic management system. It solves two major problems in universities today:
1. **Identity Fraud in Attendance:** Solved using 3D passive liveness detection and facial recognition.
2. **Academic Plagiarism in Code:** Solved using deep semantic code scanning (Abstract Syntax Trees) instead of just checking for copy-pasted text.

**The Tech Stack:**
*   **Frontend (The User Interface):** React.js (built with Vite for speed), styled with Tailwind CSS, and using Framer Motion for smooth animations.
*   **Backend (The Engine):** Python using FastAPI. FastAPI was chosen because it is incredibly fast and handles asynchronous AI model loading perfectly.
*   **Database:** Relational Database (SQLite/PostgreSQL) managed by SQLAlchemy ORM.

---

## 2. Core Concept: AI Biometric Attendance
When a student attends a defense or lecture, the system verifies their identity.

**How does it work?**
It uses a two-step AI pipeline:
1.  **Liveness Detection (Anti-Spoofing):** Before we check *who* the person is, we check *if they are a real, live human*. We use a lightweight neural network (MiniFASNet). It analyzes the texture and 3D depth map of the face from a standard 2D webcam to detect if someone is holding up a printed photo or an iPad screen.
2.  **Facial Embedding (FaceNet):** Once we confirm it's a real human, the system runs FaceNet. FaceNet converts the face into a mathematical vector of 512 numbers (called an "embedding"). We compare this vector against the student's saved vector in the database using "Cosine Similarity". If the math matches closely (e.g., >95%), they are marked as `Present`.

---

## 3. Core Concept: AST Plagiarism Scanner
When students submit programming projects, we need to make sure they didn't cheat.

**What is AST?**
AST stands for **Abstract Syntax Tree**. When a computer reads code (like Python or C++), it doesn't read the text; it breaks the code down into a tree structure of logic (loops, variables, function calls).

**How does it detect cheating?**
Traditional plagiarism checkers just compare words. If a student renames all their variables from `student_name` to `x`, a traditional checker might say it's 0% plagiarized. 
Our AST Scanner ignores variable names and comments. It compares the *structural logic tree* of the code. If two projects have the exact same logic structure, our system flags it as highly similar, even if the student changed every single word in the file.

---

## 4. Expected Jury Questions & The Perfect Answers

**Q1: Why did you choose FastAPI over traditional frameworks like Django or PHP?**
> **Answer:** "Because this project relies heavily on real-time AI inference (Facial Recognition and Liveness Detection). FastAPI is built on asynchronous programming (`async/await`), meaning it can handle multiple heavy AI operations concurrently without freezing the server. It's also significantly faster than Django."

**Q2: If I hold up a high-quality video of a student on my phone, will your attendance system be fooled?**
> **Answer:** "No. Our system uses a 3D Passive Liveness Detection model (MiniFASNet). It analyzes micro-textures, screen reflections, and depth maps. A screen emits light differently than human skin and is perfectly flat (2D). The AI detects these anomalies and blocks the spoofing attempt before facial recognition even begins."

**Q3: How is your plagiarism scanner different from standard text-matching tools like Turnitin?**
> **Answer:** "Standard tools use token-matching or text comparison. If a student renames variables or adds random comments, those tools fail. Our system parses the code into an Abstract Syntax Tree (AST), which represents the fundamental logic of the program. We compare the logic, not the text. It's much harder to fool."

**Q4: How does the frontend communicate with the backend?**
> **Answer:** "They communicate via a RESTful API. The React frontend sends HTTP requests (GET, POST, PUT, DELETE) using the native JavaScript `fetch` API (managed in our `lib/api.ts` file). The FastAPI backend processes these requests, talks to the database via SQLAlchemy, and returns JSON data back to React."

**Q5: What happens if the database grows too large with biometric data?**
> **Answer:** "We don't save heavy image files in the database. When a user registers, we process their face once, extract the 512-dimensional embedding (which is just a small array of numbers), and save only that array as a string. This keeps the database incredibly lightweight and fast."

---

## 5. How to Study the Codebase

If you need to show the code to your professors, here is where everything lives:
*   **`frontend/src/pages/`**: Contains the visual UI for every page (e.g., `Attendance.tsx`, `UserManagement.tsx`).
*   **`frontend/src/lib/api.ts`**: The bridge. This file contains all the functions that talk to the backend.
*   **`biometric_security_engine/api/main.py`**: The heart of the backend. It contains the API endpoints and the SQLAlchemy database models (Users, Projects, Meetings).
*   **`biometric_security_engine/seed_db.py`**: The script we wrote to inject all the fake data into the system for demonstration purposes.

*Note: Read through this guide multiple times. Practice explaining these concepts out loud. When you can explain AST and Liveness Detection simply, your professors will be incredibly impressed.*
