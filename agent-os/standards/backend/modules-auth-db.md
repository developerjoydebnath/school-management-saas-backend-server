# Modules, Auth, and DB Schema

## Module Structure

NestJS features must be organized by domain inside the `src/modules/` directory (e.g., `src/modules/academics/sessions`). Each module must encapsulate its own Controller, Service, Module definition, and a `dto/` folder.

```typescript
// ✅ Correct Directory Structure
src/modules/academics/sessions/
  ├── dto/
  │   └── session.dto.ts
  ├── sessions.controller.ts
  ├── sessions.service.ts
  └── sessions.module.ts
```

**Why:** Domain-driven grouping prevents the codebase from becoming a tangled monolith of "all controllers" and "all services". It ensures that code relating to a specific business feature is kept close together, making it easier to maintain, extract, or refactor later.

## Authentication Flows

Sensitive credentials generated during authentication flows (like Refresh Tokens and Password Reset OTPs) must never be stored in plain text. They must be hashed using `bcrypt` before being saved to the database. Access tokens should be short-lived (e.g., 20m) and refresh tokens long-lived (e.g., 15d).

```typescript
// ✅ Correct
const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
await this.prismaService.user.update({ data: { hashedRefreshToken } });

// ❌ Wrong
await this.prismaService.user.update({ data: { refreshToken } });
```

**Why:** Storing tokens or OTPs in plaintext creates a severe security vulnerability. If the database is compromised, an attacker could use plain refresh tokens or active OTPs to immediately hijack user accounts without needing to crack passwords.

## Database Schema & Isolation

When designing Prisma schemas for multi-tenancy, authentication credentials (`User`) must reside in the global `public` schema, while school-specific details (`UserProfile`) must reside in the tenant's isolated schema. Additionally, timestamps must use `@db.Timestamptz`.

## UUID v7 Primary Key Standard

All new Prisma models must use PostgreSQL 18 native UUID v7 defaults for primary keys:

```prisma
id String @id @default(dbgenerated("uuidv7()")) @db.Uuid
```

**Why:** UUID v7 is time-ordered, globally unique, and much friendlier to PostgreSQL B-tree indexes than random UUID v4. It improves insert locality for high-write SaaS tables while keeping IDs safe for distributed systems.

Rules:

1. **Use `uuidv7()` for every new primary `id` default.**
2. **Do not use `gen_random_uuid()` or application-side UUID v4 for new primary keys.**
3. **Do not rewrite existing UUID values when adopting UUID v7.** Existing UUID v4 rows remain valid and must be preserved.
4. **Migrations must change column defaults only** unless the user explicitly approves a data rewrite. Use `ALTER TABLE ... ALTER COLUMN id SET DEFAULT uuidv7();`.
5. **Do not use UUID v7 as the only business ordering rule.** List APIs should still order by the correct business timestamp, with `id` as a stable tie-breaker:

```typescript
orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
```

For business-specific lists, use the domain date first, then `id` as a tie-breaker, such as `paidAt`, `updatedAt`, `changedAt`, `version`, `startDate`, or `expiresAt` depending on the module.

## Prisma Schema Formatting Standards

To maintain consistency and optimize database performance across schemas, strictly follow these formatting and indexing rules for `schema.prisma`:

1. **CamelCase Fields to Snake_Case Columns**: Always define Prisma fields in `camelCase` for TypeScript compatibility, and map them to `snake_case` column names using `@map("snake_case")`.
2. **Explicit Table and Schema Mapping**: Every model MUST define its table name in snake_case and explicitly declare its schema via `@@map("table_name")` and `@@schema("schema_name")`.
3. **Database Indexing**: Add `@@index([...])` blocks to models to optimize frequently queried fields (that aren't already covered by `@@unique`) to make DB queries faster.
4. **Relationship Maintenance**: Clearly define and maintain relationships between models, ensuring proper references and array formats are kept intact (e.g., `permissions UserPermission[]`).

```prisma
// ✅ Correct
model UserProfile {
  id        String    @id @default(dbgenerated("uuidv7()")) @db.Uuid
  userId    String    @unique @map("user_id") @db.Uuid
  fullName  String    @map("full_name") @db.VarChar(255)
  phone     String?   @db.VarChar(20)

  permissions UserPermission[]

  // Optimize lookups
  @@index([phone])

  // Explicit mappings
  @@map("user_profiles")
  @@schema("public") // or "tenant" based on the domain
}

// ❌ Wrong
model UserProfile {
  id        String    @id @default(dbgenerated("uuidv7()")) @db.Uuid
  user_id   String    @unique @db.Uuid // Wrong: snake_case in Prisma field
  fullName  String    @db.VarChar(255) // Wrong: missing @map("full_name")

  // Wrong: missing @@index
  // Wrong: missing @@map and @@schema
}
```

**Why:** Prisma translates model definitions directly into TypeScript types. Using `camelCase` keeps the application code idiomatic, while mapping to `snake_case` adheres to Postgres database conventions. Defining schemas, table names, and indexes explicitly ensures that queries are consistently fast, and multi-tenant schema isolation behaves correctly.

## Prisma API Activation Checklist

When adding a new Prisma-backed backend API, the task is not complete until the database schema and generated Prisma Client are both updated.

Required steps:

1. Add/update `schema.prisma`.
2. Apply the database changes for the affected schema only. Do not run a broad `db push --accept-data-loss` when unrelated warnings appear; create/apply a targeted migration or SQL patch instead.
3. Run `npx.cmd prisma generate` after schema changes.
4. Verify the generated client has the new model delegates before testing APIs.
5. Run a small runtime query against the new delegate/table.
6. Restart the backend dev server if it was already running before client generation.

Common failure:

If every endpoint in a newly added module returns `500 Internal Server Error`, first check for stale Prisma Client or missing database tables. This usually means the code was added but `prisma generate` or the schema migration step was skipped.

For tenant-scoped models that use `@@schema("tenant")`, runtime Prisma queries target the literal `tenant` schema. Manual SQL patches must update:

1. `tenant` — the runtime schema used by Prisma tenant models.
2. `tenant_template` — so newly activated schools inherit the table shape.
3. Existing school schemas such as `model_high_school` — so already-created tenants keep working.

Do not only patch real school schemas. If `tenant.<table>` is missing, newly added APIs can still return 500 even when the table exists in cloned school schemas.

```powershell
# Example checks
npx.cmd prisma validate
npx.cmd prisma generate

# Runtime delegate check for a new model
node -e "const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); p.newModel.count().then(console.log).finally(()=>p.$disconnect())"
```

For PostgreSQL 18 UUID v7 work, confirm the database supports `uuidv7()` before applying migrations that depend on it.

## Multi-Identifier Login

The `signIn` method must support three login identifier types from a **single input field**:

| Role                                    | Identifier         | Column         |
| --------------------------------------- | ------------------ | -------------- |
| Super admin                             | `email@domain.com` | `email`        |
| School admin / Teacher / Staff / Parent | `01XXXXXXXXX`      | `phone`        |
| Student                                 | `STU-YYYY-NNN`     | `student_code` |

The identifier type is detected at runtime by regex before querying. Each type maps to its own Prisma `@@unique([field, schemaName])` compound index, so `findUnique` uses the correct index path with **no raw SQL**.

```typescript
// ✅ Correct — type-safe, injection-proof, uses indexed @@unique paths
async signIn(dto: SignInDto) {
  const schemaName = this.tenantConnection.getTenantSchema();
  const { identifier, password } = dto;

  const isStudentCode = /^STU-\d{4}-\d+$/i.test(identifier);
  const isPhone       = /^01[3-9]\d{8}$/.test(identifier);
  const isEmail       = identifier.includes('@');

  if (!isStudentCode && !isPhone && !isEmail) {
    throw new UnauthorizedException('Enter a valid Student ID, phone number, or email address');
  }

  let user: Awaited<ReturnType<typeof this.prismaService.user.findUnique>>;

  if (isStudentCode) {
    user = await this.prismaService.user.findUnique({
      where: { studentCode_schemaName: { studentCode: identifier, schemaName } },
    });
  } else if (isPhone) {
    user = await this.prismaService.user.findUnique({
      where: { phone_schemaName: { phone: identifier, schemaName } },
    });
  } else {
    user = await this.prismaService.user.findUnique({
      where: { email_schemaName: { email: identifier, schemaName } },
    });
  }

  if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');
  // ... bcrypt compare, token issuance
}

// ❌ Wrong — raw SQL is a SQL injection risk; also bypasses Prisma's type safety
const user = await prisma.$queryRawUnsafe(`
  SELECT * FROM public.users WHERE ${whereClause} AND schema_name = '${schema}'
`);
```

**Why:** Three sibling students can share the same parent phone number but each has a unique `student_code`. Email-only login would force students to have individual email addresses, which is impractical for school-aged children. Separating the identifier column per role avoids collisions while using the correct index for every lookup.
