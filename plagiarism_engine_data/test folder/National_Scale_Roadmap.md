# Secure-FEPRH: National Scaling Architecture Plan

Based on the analysis of your existing `Secure-FEPRH` architecture (React, FastAPI, PostgreSQL, AI Workers, Biometrics), the system is incredibly well-designed for a single department. However, scaling it to a **National Project** requires fundamental changes to the infrastructure, database design, and deployment strategy to support hundreds of universities, thousands of faculties, and massive AI processing loads.

This document outlines the global roadmap we will follow in future sessions to upgrade this system.

## User Review Required
> [!WARNING]
> Moving to a national scale requires converting the PostgreSQL database to a **Multi-Tenant** architecture. This means we will need to change almost every table to include a `tenant_id` (e.g., `university_id`) and implement PostgreSQL Row-Level Security (RLS) so that universities cannot access each other's private code repositories or data. Please review the Database section closely.

## Open Questions
> [!IMPORTANT]
> 1. **Hosting:** Will the national system be hosted on a cloud provider like Google Cloud/AWS, or on national on-premise government servers? (This affects how we handle file storage for the code repositories).
> 2. **AI Processing:** Do you want to run the Heavy NLP (AraBERT) and Face Recognition models on specialized GPU servers, or should we optimize them to run on standard CPU clusters?
> 3. **Federation:** Should each university have its own separate database, or will they share a massive central database with strict access rules? (I recommend a shared database with Row-Level Security for easier cross-university plagiarism checking).

---

## Proposed Changes & Upgrades

### 1. Multi-Tenant Database Architecture
To handle the entire nation, the database must isolate data per university, while still allowing the National Plagiarism Engine to scan across all universities.

* **Add Global Roles:** Introduce `Ministry_Admin` (Global view) and `University_Admin` (Tenant view).
* **Row-Level Security (RLS):** Implement Postgres RLS using Supabase or raw SQL. This ensures that even if a developer makes a mistake in the FastAPI backend, a user from University A physically cannot query data from University B.
* **National Plagiarism Indexing:** The AST Code Hashing and TF-IDF/AraBERT vectors will be stored in a specialized vector database (e.g., pgvector) to allow instant similarity searching across millions of graduation projects nationwide.

### 2. Distributed AI Worker Scaling
Your current design uses Celery and Redis. This is great, but a national scale will crash a single Redis instance with thousands of students uploading code and video feeds at once.

* **Message Broker Upgrade:** Move from Redis to RabbitMQ or Apache Kafka for the heavy AI task queuing.
* **GPU Worker Pools:** Separate the Celery queues. Have one queue for fast tasks (Email, Notifications) and a separate queue routed strictly to GPU-enabled servers for the Computer Vision (Liveness/Face Auth) and AraBERT Semantic NLP.

### 3. File Storage & Secure Repositories
Storing files directly on the filesystem (as currently planned) will not scale nationally and creates a single point of failure.

* **Object Storage (S3):** Migrate the secure repository to an S3-compatible object storage (AWS S3, MinIO, or Google Cloud Storage).
* **KMS Encryption:** Instead of simple AES-256 in Python, use a centralized Key Management Service (KMS) so that each university's files are encrypted with their own unique master key.

### 4. Advanced Cybersecurity Integration
As a national system, security is paramount.

* **API Gateway:** Place an API Gateway (like Kong or Traefik) in front of the FastAPI backend to handle rate-limiting, WAF (Web Application Firewall) rules, and DDoS protection globally.
* **MCP Security Scanning:** We will integrate the **Snyk MCP Server** into the development pipeline so that the backend is continuously audited for vulnerabilities automatically.

### 5. Frontend Scalability
* **Micro-Frontends / Dynamic Loading:** The React Vite application should use dynamic imports to code-split heavily. We don't want a student loading the heavy Analytics Dashboard charts if they are just logging in to do a face scan.
* **Edge Caching:** Serve the frontend via a global CDN (Content Delivery Network) so that students in remote areas of the country get fast load times.

---

## Verification Plan

### Automated Tests
- We will implement robust load-testing using `locust` to simulate 10,000 students doing Face Authentications simultaneously to ensure the AI worker pool scales horizontally.
- Unit tests to verify that PostgreSQL Row-Level Security explicitly blocks cross-university data leakage.

### Manual Verification
- We will deploy a staging environment simulating 3 different universities. We will verify that a supervisor at University A cannot see or grade a project at University B, but the Plagiarism Engine successfully detects if a student at University A copied code from a student at University B.
