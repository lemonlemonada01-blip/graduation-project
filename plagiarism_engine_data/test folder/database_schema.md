# Secure-FEPRH Database Schema Overview

This document provides a comprehensive overview of the entire database schema for the Secure-FEPRH project, upgraded for National-Scale Enterprise architecture.

## 1. Entity-Relationship (ER) Diagram

The following diagram illustrates how all the tables in the system are connected:

```mermaid
erDiagram
    UNIVERSITIES ||--o{ FACULTIES : "contains"
    FACULTIES ||--o{ DEPARTMENTS : "contains"
    
    DEPARTMENTS ||--o{ USERS : "employs/enrolls"
    DEPARTMENTS ||--o{ PROJECTS : "owns"
    
    UNIVERSITIES ||--o{ USERS : "tenant (RLS)"
    UNIVERSITIES ||--o{ PROJECTS : "tenant (RLS)"

    USERS ||--o{ FACE_ENCODINGS : "has"
    USERS ||--o{ PROJECTS : "supervises"
    USERS ||--o{ PROJECT_MEMBERS : "belongs to"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ AUDIT_LOGS : "generates"
    USERS ||--o{ COMMENTS : "writes"

    PROJECTS ||--o{ PROJECT_MEMBERS : "has"
    PROJECTS ||--o{ PROJECT_FILES : "contains"
    PROJECTS ||--o{ SIMILARITY_REPORTS : "checked by"
    PROJECTS ||--|| BOARDS : "has"

    BOARDS ||--o{ COLUMNS : "has"
    COLUMNS ||--o{ TASKS : "contains"
    TASKS ||--o{ COMMENTS : "has"

    DISCUSSION_SESSIONS ||--o{ ATTENDANCE_LOGS : "records"
    PROJECTS ||--o{ DISCUSSION_SESSIONS : "has"

    UNIVERSITIES {
        int id PK
        string name UK
        datetime created_at
    }

    FACULTIES {
        int id PK
        string name
        int university_id FK
        datetime created_at
    }

    DEPARTMENTS {
        int id PK
        string name
        int faculty_id FK
        datetime created_at
    }

    USERS {
        int id PK
        string email UK
        string password_hash
        string full_name
        enum role "student|supervisor|head|faculty_dean|university_admin|ministry_admin"
        int department_id FK
        int university_id FK "Tenant ID for RLS"
        boolean is_active
        datetime created_at
        datetime last_login
    }

    FACE_ENCODINGS {
        int id PK
        int user_id FK
        float_array encoding_vector "128 dimensions"
        datetime enrolled_at
        string enrolled_device
    }

    PROJECTS {
        int id PK
        string title
        text abstract
        string domain
        enum status "proposed|approved|in_progress|completed|archived"
        int supervisor_id FK
        int department_id FK
        int university_id FK "Tenant ID for RLS"
        string pinecone_vector_id "Cloud Vector DB Ref"
        int academic_year
        datetime created_at
        datetime updated_at
    }

    PROJECT_MEMBERS {
        int id PK
        int project_id FK
        int user_id FK
        enum member_role "leader|member"
        datetime joined_at
    }

    PROJECT_FILES {
        int id PK
        int project_id FK
        int uploaded_by FK
        string original_filename
        string stored_path
        string sha256_hash
        int file_size_bytes
        string mime_type
        int version_number
        string encryption_key_ref
        datetime uploaded_at
    }

    SIMILARITY_REPORTS {
        int id PK
        int project_id FK
        float text_similarity_score
        float code_similarity_score
        json matched_projects "array of project_id and score"
        enum status "pending|completed|error"
        datetime generated_at
    }

    BOARDS {
        int id PK
        int project_id FK
        datetime created_at
    }

    COLUMNS {
        int id PK
        int board_id FK
        string title
        int position
    }

    TASKS {
        int id PK
        int column_id FK
        string title
        text description
        int assigned_to FK
        enum priority "low|medium|high|critical"
        date due_date
        int position
        datetime created_at
        datetime updated_at
    }

    COMMENTS {
        int id PK
        int task_id FK
        int user_id FK
        text content
        datetime created_at
    }

    DISCUSSION_SESSIONS {
        int id PK
        int project_id FK
        datetime scheduled_at
        datetime started_at
        datetime ended_at
        enum status "scheduled|active|completed"
    }

    ATTENDANCE_LOGS {
        int id PK
        int session_id FK
        int user_id FK
        float confidence_score
        int frame_count
        datetime first_detected_at
        datetime last_detected_at
        boolean confirmed
    }

    NOTIFICATIONS {
        int id PK
        int user_id FK
        string title
        text message
        enum type "info|warning|critical|success"
        boolean is_read
        string action_url
        datetime created_at
    }

    AUDIT_LOGS {
        int id PK
        int user_id FK
        string action "login|upload|download|delete|approve|reject"
        string resource_type
        int resource_id
        string ip_address
        text details
        datetime created_at
    }

    CASBIN_RULES {
        int id PK
        string ptype "Policy Type"
        string v0 "Subject"
        string v1 "Object"
        string v2 "Action"
    }

    FAILED_JOBS_DLQ {
        int id PK
        string task_id UK
        json payload
        text error_traceback
        datetime failed_at
    }
```

## 2. Core Modules & Tables Summary

### The Multi-Tenant Hierarchy (National Scale)
*   **`UNIVERSITIES`**, **`FACULTIES`**, **`DEPARTMENTS`**: The strict structural hierarchy of the Ministry of Higher Education.
*   **Tenant Isolation**: Both `USERS` and `PROJECTS` now possess a `university_id` column. This acts as the anchor for **PostgreSQL Row-Level Security (RLS)**, mathematically guaranteeing that one university cannot access another's data.

### Identity, Access & Security
*   **`USERS`**: The central entity for all platform users. Roles map to the national hierarchy (Student -> Supervisor -> Head -> Dean -> Univ Admin -> Ministry).
*   **`FACE_ENCODINGS`**: Stores the 128-dimensional biometric vectors used for Face MFA. *Crucially, raw images are not stored here for privacy.*
*   **`CASBIN_RULES`**: The dynamic policy engine table. Defines complex RBAC/ABAC rules (e.g., grading permissions, dashboard visibility) without hardcoding logic in Python.
*   **`AUDIT_LOGS`**: An immutable ledger of critical actions (logins, uploads, deletions) used for security and accountability.

### Project & AI Management
*   **`PROJECTS`**: Contains core project metadata. Notably includes `pinecone_vector_id`, linking this SQL row to its corresponding highly-compressed AI embedding in the **Pinecone Cloud Vector Database** for instant national plagiarism scans.
*   **`PROJECT_MEMBERS`**: A junction table linking multiple students to a project (supports team leaders and members).
*   **`PROJECT_FILES`**: The secure code repository tracking file uploads, hashes, sizes, version numbers, and AES-256 encryption key references.
*   **`SIMILARITY_REPORTS`**: Stores the AI-generated plagiarism scores (text and code) retrieved from the Pinecone vector math engine.

### Kanban & Task Tracking
*   **`BOARDS`**, **`COLUMNS`**, **`TASKS`**, **`COMMENTS`**: Standard Agile workflow components mapped 1-to-1 with a project for real-time WebSocket updates.

### Smart Attendance
*   **`DISCUSSION_SESSIONS`**: Represents a scheduled defense or presentation session for a project.
*   **`ATTENDANCE_LOGS`**: The output of the Computer Vision AI. Records when a face was detected, the confidence score, and confirmation of presence.

### DevOps & Background Queues
*   **`FAILED_JOBS_DLQ`**: The Dead-Letter Queue. If a Celery/RabbitMQ background task (like sending emails or AI parsing) fails completely, its payload and error trace are saved here for Ministry Admin review.
