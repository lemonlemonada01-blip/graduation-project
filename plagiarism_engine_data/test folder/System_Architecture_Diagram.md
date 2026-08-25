# System Architecture Diagram (Secure-FEPRH)

This document contains the high-level system architecture for the **Secure-FEPRH** platform. 
The diagram below illustrates how the different users, frontend, backend, AI modules, and databases interact with each other.

```mermaid
graph TD
    %% Actors
    subgraph Users ["👥 End Users"]
        S[Student]
        Sup[Academic Supervisor]
        DH[Department Head]
    end

    %% Frontend
    subgraph Frontend ["💻 Client Side (React.js + Tailwind)"]
        UI[Web Interface]
        KB[Kanban Boards]
        Dash[Analytics Dashboard]
        Cam[Camera Integration]
    end

    %% Backend
    subgraph Backend ["⚙️ Server Side (FastAPI)"]
        API[API Gateway / Router]
        IAM[IAM & Security Module]
        FM[File Management Module]
        TM[Task Management Module]
    end

    %% AI & Processing Workers
    subgraph AI_Workers ["🧠 AI & Background Workers (Celery)"]
        Bio["Biometric Engine (Dlib, MediaPipe)"]
        NLP["Text Similarity Engine (Farasa, AraBERT)"]
        AST["Code Plagiarism Checker (AST / MOSS)"]
    end

    %% Databases
    subgraph DB ["🗄️ Database Layer (PostgreSQL)"]
        RelDB[("Relational Data (Users, Projects)")]
        FaceDB[("Face Embeddings (128D Vectors)")]
    end

    %% Secure Storage
    subgraph Storage ["📁 Secure Storage"]
        FS["Encrypted File System (Code, PDFs)"]
    end

    %% Connections - Users to Frontend
    S -->|"Interacts"| UI
    Sup -->|"Evaluates"| UI
    DH -->|"Monitors"| UI

    %% Frontend interactions
    UI --- KB
    UI --- Dash
    UI --- Cam

    %% Frontend to Backend
    UI <-->|"REST APIs (JSON)"| API
    Cam -->|"Video Stream for Login/Attendance"| Bio

    %% Backend Routing
    API --> IAM
    API --> FM
    API --> TM

    %% Backend to AI Workers
    IAM -->|"Auth Request"| Bio
    FM -->|"Process Proposal Text"| NLP
    FM -->|"Process Source Code"| AST

    %% AI to DB
    Bio <-->|"Match Encodings"| FaceDB

    %% Backend to DB & Storage
    IAM <-->|"Validate Roles / JWT"| RelDB
    TM <-->|"Fetch/Update Tasks"| RelDB
    FM <-->|"Store Metadata"| RelDB
    FM <-->|"Save/Fetch Encrypted Files"| FS
```

### Flow Explanation for the Doctor:

1. **User Interaction**: Students, Supervisors, and the Department Head interact with the **React.js Frontend**. Depending on their RBAC role, they access different modules (Kanban boards, Dashboards, File Uploads).
2. **Camera Integration**: When a user attempts to log in or mark attendance, the frontend captures the video stream and sends it directly to the **Biometric Engine**.
3. **Backend API Gateway**: All standard requests (fetching data, submitting forms) go through the **FastAPI Gateway**, which routes them to the appropriate logic modules.
4. **IAM (Identity & Access Management)**: Handles token generation (JWT) and validates user permissions against the **PostgreSQL Database**.
5. **AI Workers (Background Tasks)**: 
   - Heavy tasks like **Plagiarism Checking (NLP & AST)** are offloaded to background workers so the main server doesn't freeze.
   - The **Biometric Engine** handles Face Recognition and Liveness Detection.
6. **Data Storage**:
   - Structured data (Users, Roles, Project Names) is saved in the **Relational DB**.
   - The highly sensitive **Face Encodings** (mathematical vectors, not raw photos) have their own secure tables.
   - Actual project files and source codes are stored in the **Encrypted File System**.
