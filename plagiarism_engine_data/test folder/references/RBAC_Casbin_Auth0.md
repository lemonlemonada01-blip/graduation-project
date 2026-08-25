# Mastering Role-Based Access Control (Auth0 & Casbin Reference)

Enterprise security requires robust authorization patterns to ensure users only access what they are permitted to.

## 1. RBAC vs. ABAC (Auth0 Paradigm)

### Role-Based Access Control (RBAC)
Access is granted based on the user's role in the organization.
- Example: "You are a `Supervisor`, therefore you can grade projects."
- **Pros:** Simple to understand, easy to implement for standard hierarchies.
- **Cons:** Inflexible for granular edge cases. (e.g., "A supervisor can grade projects, but ONLY the projects they are assigned to").

### Attribute-Based Access Control (ABAC)
Access is granted based on attributes (user attributes, resource attributes, environment attributes).
- Example: "You can grade this project IF your `user_id` matches the project's `assigned_supervisor_id` AND the current time is before the `grading_deadline`."
- **Pros:** Extremely granular and dynamic.
- **Cons:** Complex to implement and compute.

**For Secure-FEPRH:** We need a hybrid approach. Global RBAC for high-level endpoints (e.g., only Admins can access the dashboard), mixed with resource-level checks (Supervisors can only view their own students).

---

## 2. JSON Web Tokens (JWT)
JWTs are the modern standard for stateless API authentication.
- **Stateless:** The backend does not need to query the database to verify a session. The token itself contains the claims (e.g., `role: "student"`, `tenant_id: "univ_123"`).
- **Security:** The token is cryptographically signed. If a user modifies their role in the token, the signature becomes invalid and FastAPI will reject it.

---

## 3. Access Control Enforcement via Casbin
Instead of hardcoding complex `if/else` permission logic throughout the FastAPI backend, modern enterprises use policy engines like **Casbin**.

### How Casbin Works:
Casbin separates the access control logic into two parts:
1. **Model (CONF file):** Defines the authorization paradigm (e.g., RBAC). 
   - Specifies what a request looks like `[request_definition] r = sub, obj, act` (Subject, Object, Action).
2. **Policy (CSV/DB):** The actual rules.
   - `p, supervisor, project_files, read`
   - `p, student, own_project, write`

### Architectural Takeaway for Secure-FEPRH:
- Keep the FastAPI endpoints clean. 
- Pass the JWT claims to a middleware that utilizes a robust policy engine (like Casbin or FastAPI-Depends logic) to resolve permissions before the business logic is ever executed.
