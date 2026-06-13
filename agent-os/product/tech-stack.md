# Tech Stack

The `backend-server` is built using the following core technologies:

- **Framework**: NestJS + TypeScript (v11)
- **Database**: PostgreSQL with schema-per-tenant isolation (each school gets its own PostgreSQL schema named after their slug)
- **ORM**: Prisma (v5)
- **Cache**: Redis
- **Queue**: BullMQ
- **File storage**: Cloudflare R2
- **Auth**: Passport with JWT (`passport-jwt`), `bcrypt`. Access token (15min), Refresh token (30 days) stored in `HttpOnly` cookie.
- **Connection pool**: PgBouncer
- **Routing**: Nginx with Host header tenant detection
- **SMS**: SSL Wireless BD
- **Payments**: bKash API + Nagad API via BullMQ queue workers
- **API Documentation**: Swagger (`@nestjs/swagger`)
- **Testing**: Jest & Supertest
- **Package Manager**: pnpm
