# Multi-Tenant SaaS Database Tenancy Patterns (Microsoft Architecture Reference)

When building an enterprise-grade SaaS application, deciding how to partition tenant data is critical for security, scalability, and performance.

## 1. Database-per-Tenant (Isolated)
Each tenant gets their own separate database.
- **Pros:** Highest data isolation. No risk of accidental cross-tenant data leakage. Easy to restore a single tenant from backups. Easy to scale by placing databases on different servers.
- **Cons:** Very expensive and resource-intensive. Hard to manage schema migrations across thousands of databases. Querying data across all tenants (e.g., for a national plagiarism check) is extremely difficult.

## 2. Single Multi-Tenant Database (Shared Schema, Shared DB)
All tenants share the same database and the same tables. A `tenant_id` column is added to every table.
- **Pros:** Lowest cost. Easy to maintain and update schemas. Cross-tenant queries are trivial.
- **Cons:** "Noisy neighbor" problem (one tenant's heavy query can slow down others). High risk of data leakage if a developer forgets to add `WHERE tenant_id = X` in a query.

## 3. Sharded Multi-Tenant Database
Tenants are distributed across multiple databases (shards), but multiple tenants share each shard.
- **Pros:** Balances cost and scalability.

---

## The Modern PostgreSQL Solution: Row-Level Security (RLS)
For **Secure-FEPRH**, we utilize a Single Multi-Tenant Database pattern but mitigate the security risks using **PostgreSQL Row-Level Security (RLS)**.

### How RLS Works:
Instead of relying on the backend application (FastAPI) to constantly append `WHERE tenant_id = X` to every single query, RLS enforces security at the **database engine level**.

1. You enable RLS on a table: `ALTER TABLE projects ENABLE ROW LEVEL SECURITY;`
2. You create a policy: 
   ```sql
   CREATE POLICY tenant_isolation_policy ON projects
   USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
   ```
3. When FastAPI connects to the database, it sets the current tenant variable for that specific transaction based on the user's JWT token.
4. If a malicious user or a buggy backend query tries to run `SELECT * FROM projects`, PostgreSQL intercepts it and **only** returns the rows belonging to their university.

### Architectural Takeaway for Secure-FEPRH:
- Use a shared PostgreSQL database to allow the AI Plagiarism engine to scan all projects nationally.
- **Strictly enforce RLS** on every single table containing sensitive student or university data so that data isolation is mathematically guaranteed by the database engine.
