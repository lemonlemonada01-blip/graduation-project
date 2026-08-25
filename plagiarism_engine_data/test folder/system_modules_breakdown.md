# System Modules Breakdown: Secure-FEPRH Project

Based on the architecture of the **Secure-FEPRH (Faculty of Engineering Project & Research Hub)**, the system encompasses advanced backend security, real-time collaboration, artificial intelligence, and a modern React frontend. 

The implementation of the system is divided into four distinct technical modules, designed to be handled in parallel.

---

## 🏗️ Module 1: Core Architecture & Security
**Focus:** System Foundation, Cryptography, Multi-Tenancy, and DevOps

This module handles the most critical and complex infrastructure that the rest of the application relies upon. It requires deep knowledge of backend systems, security protocols, and database management.

### Key Components to Implement:
1. **Database Architecture & Multi-Tenancy:**
   - Design the SQLAlchemy database models (`app/models.py`).
   - Implement the hierarchical data structure (Ministry → University → Faculty → Department).
   - Manage database migrations using Alembic (`alembic/`, `alembic.ini`).
2. **Authentication & Hierarchical RBAC (Role-Based Access Control):**
   - Implement secure JWT generation and validation (`app/auth.py`).
   - Build strict dependency injection bouncers in FastAPI (`app/dependencies.py`) to ensure users can only access data within their clearance level (e.g., a Dean can only see their Faculty's projects).
3. **Secure Document Repository:**
   - Implement AES-256-GCM encryption/decryption for all uploaded files (`app/crypto.py`).
   - Build the `file_validator.py` to perform magic byte analysis, blocking malicious executables before they hit the database.
4. **DevOps & Asynchronous Processing:**
   - Configure the Celery and Redis worker pipeline (`app/worker/celery_app.py`) to offload heavy background tasks.
   - Handle server deployment and local environment configurations.

---

## 🤖 Module 2: Artificial Intelligence & Biometrics Engine
**Focus:** Computer Vision, Natural Language Processing, and Python Data Science

This module focuses exclusively on the AI micro-services that give the application its cutting-edge "smart" capabilities. 

### Key Components to Implement:
1. **National Plagiarism Engine:**
   - **Code Similarity (`app/ai/ast_similarity.py`):** Write algorithms to parse Python/JS code into Abstract Syntax Trees (AST), strip out variable names, and calculate structural distances to catch students who rename variables.
   - **Text Similarity (`app/ai/nlp_similarity.py`):** Implement NLP pipelines using TF-IDF and Cosine Similarity to compare abstracts and project descriptions. 
2. **Face Recognition Attendance (`app/ai/face_engine.py`):**
   - Integrate OpenCV and face recognition libraries.
   - Implement logic to convert webcam feeds into 128-dimensional facial encodings.
   - Write the distance comparison algorithm to verify student identities against their database encodings.
3. **AI Backend Routes:**
   - Expose the AI engines to the frontend via FastAPI endpoints (e.g., `/plagiarism/scan` and `/attendance/verify`).

---

## ⚡ Module 3: Real-Time Collaboration & Analytics
**Focus:** WebSockets, Dynamic Dashboards, and Agile Workflows

This module bridges the gap between the frontend and backend, focusing on real-time data flow, complex SQL aggregations, and interactive UI components.

### Key Components to Implement:
1. **Real-Time Kanban Board:**
   - **Backend:** Implement WebSocket connections (`app/ws.py`, `app/routers/kanban.py`) to broadcast task movements to all connected clients instantly.
   - **Frontend:** Build the interactive drag-and-drop Kanban Board UI (`KanbanBoard.jsx`) using drag-and-drop libraries.
2. **Hierarchical Analytics Engine:**
   - **Backend:** Write complex SQLAlchemy queries (`app/routers/analytics.py`) that dynamically calculate statistics based on the requesting user's hierarchical role.
   - **Frontend:** Build the Command Center Dashboard (`DashboardHome.jsx`), integrating charting libraries to display the analytics visually.
3. **Meeting Management:**
   - Build the CRUD operations and frontend interface (`MeetingManagement.jsx`) for scheduling supervisor-student meetings and linking them to the AI attendance logs.

---

## 🎨 Module 4: Frontend Foundation, UX/UI, & User Management
**Focus:** React/Vite Infrastructure, Styling, State Management, and Core Portals

This module ensures the application looks professional, functions smoothly across devices, and provides intuitive portals for all user types.

### Key Components to Implement:
1. **Global Design System & Theming:**
   - Configure Tailwind CSS (`tailwind.config.js`) and global CSS variables (`index.css`) to establish the aesthetic (dark modes, glassmorphism, primary color tokens).
   - Implement global layouts (`DashboardLayout.jsx`, `Sidebar`, `Topbar`) and route protection (`App.jsx`).
2. **Authentication Flow UI:**
   - Build the login and registration pages (`Login.jsx`, `Register.jsx`) with animations.
   - Manage global frontend state for user sessions via React Context (`AuthContext.jsx`) and Axios interceptors (`api.js`).
3. **User Management & Profiles:**
   - Build the Admin-level User Management interface (`UserManagement.jsx`) for creating and managing university staff and students.
   - Develop the User Profile page (`UserProfile.jsx`) handling secure password changes and avatar uploads.
4. **Project Directory:**
   - Build the main Projects List view (`ProjectsList.jsx`) with advanced filtering, searching, and pagination capabilities.
   - Create the Project Overview portal (`ProjectDetail.jsx`).
