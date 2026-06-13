# Product Roadmap

## Phase 1: Core Architecture & Multi-Tenancy
- Implement schema-per-tenant PostgreSQL multi-tenancy.
- Nginx Host header tenant detection routing to PgBouncer.
- Auth system (JWT access/refresh tokens in HttpOnly cookies).
- School request & provisioning lifecycle (`SchoolRequest` model).
- User & role management (RBAC).

## Phase 2: Academic & Student Management
- Student Directory, Profiles, and Admission APIs.
- Class, Section, Shift, and Subject management.
- Timetable and Syllabus tracking.

## Phase 3: Operations & External Integrations
- Attendance, Homework, and Examination modules.
- Payment gateway integration (bKash, Nagad via BullMQ).
- SMS notifications (SSL Wireless BD).
- File uploads (Cloudflare R2).
