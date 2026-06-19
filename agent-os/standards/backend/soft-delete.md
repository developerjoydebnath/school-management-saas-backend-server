# Soft Delete

## Overview

This project uses **soft delete** across all user-facing models. Hard deletes are permanently disabled at the Prisma client level via a `$extends` query interceptor. Deleted records are never physically removed — they are hidden by default and recoverable by a super admin.

---

## Schema Requirements

Every model that participates in soft delete must include these two fields and a `@@index`:

```prisma
// ── Soft delete ──────────────────────────────────────────────
deletedAt DateTime? @map("deleted_at") @db.Timestamptz
// null = active record; non-null = soft-deleted
deletedBy String?   @map("deleted_by") @db.Uuid
// UUID of the user who performed the delete — for audit trail

@@index([deletedAt])
// Hot index: nearly every query filters WHERE deleted_at IS NULL
```

**Why both fields?** `deletedAt` is the flag (null = alive) AND a timestamp (you know *when* it was deleted). `deletedBy` is the audit trail (you know *who* deleted it). A simple `isDeleted Boolean` gives you neither.

### Models with soft delete enabled

```typescript
// src/common/utils/soft-delete.extension.ts
export const SOFT_DELETE_MODELS: Prisma.ModelName[] = [
  'User',
  'UserProfile',
  'School',
  'SchoolBankAccount',
  // Add new models here as you build tenant tables
];
```

> When you create a new model that needs soft delete: add `deletedAt`/`deletedBy` fields to the schema **and** add the model name to this array.

---

## Unique Constraints and Re-Registration

Standard Prisma `@@unique` constraints enforce uniqueness across **all** rows, including soft-deleted ones. This would block re-registering a previously deleted user with the same email/phone.

**Solution: PostgreSQL partial unique indexes** (applied via raw SQL migration):

```sql
-- Uniqueness is enforced ONLY among active (non-deleted) rows
CREATE UNIQUE INDEX users_email_schema_active_unique
  ON public.users (email, schema_name)
  WHERE deleted_at IS NULL AND email IS NOT NULL;

CREATE UNIQUE INDEX users_phone_schema_active_unique
  ON public.users (phone, schema_name)
  WHERE deleted_at IS NULL AND phone IS NOT NULL;

CREATE UNIQUE INDEX users_student_code_schema_active_unique
  ON public.users (student_code, schema_name)
  WHERE deleted_at IS NULL AND student_code IS NOT NULL;
```

> Migration file: `prisma/migrations/manual_soft_delete_partial_indexes.sql`

**Consequence:** The `User` model uses `@@index` (not `@@unique`) in the Prisma schema for email/phone/studentCode. This is intentional — uniqueness is enforced at the DB layer via partial indexes, not the Prisma schema layer.

---

## The Prisma Extension

The soft-delete filter is applied globally via `softDeleteExtension()` in `PrismaService`:

```typescript
// src/cores/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient {
  readonly client: ReturnType<typeof this._buildExtendedClient>;

  constructor() {
    super();
    this.client = this._buildExtendedClient();
  }

  private _buildExtendedClient() {
    return this.$extends(softDeleteExtension());
  }

  // Raw (unextended) client — admin restore / audit use only
  get raw(): PrismaClient {
    return this;
  }
}
```

The extension intercepts **every** query and:

| Operation | Behaviour |
|---|---|
| `findMany`, `findFirst`, `findUnique`, `count`, `aggregate`, `groupBy` | Appends `{ deletedAt: null }` to `where` automatically |
| `update`, `updateMany` | Appends `{ deletedAt: null }` — prevents updating deleted records |
| `delete`, `deleteMany` | **Throws an error** — hard deletes are forbidden |

---

## Using the Client in Services

```typescript
// ✅ Correct — use this.prisma.client for all normal queries
// Soft-deleted records are automatically invisible
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.client.user.findMany(); // never returns deleted users
  }
}

// ❌ Wrong — never call this.prisma.user.findMany() directly
// It bypasses the extension and may return deleted records unless explicitly filtered
return this.prisma.user.findMany({
  // If you MUST use the raw client, you must manually hide deleted records:
  where: { deletedAt: null } 
});
```

> **CRITICAL RULE**: All standard GET requests (`findMany`, `findAll`) must default to hiding soft-deleted data (`deletedAt = null`). Soft-deleted records are strictly meant for alternative views like an Archive or Recycle Bin, which can be fetched by passing an explicit `isDeleted=true` query param.

---

## Performing a Soft Delete

Never call `.delete()` — use the `softDelete()` helper with the raw client:

```typescript
import { softDelete } from 'src/common/utils/soft-delete.extension';

// ✅ Correct
await softDelete(this.prisma.raw.user, userId, actorId);
//                                             ^ UUID of admin performing the delete

// ❌ Wrong — throws error (hard delete blocked by extension)
await this.prisma.client.user.delete({ where: { id: userId } });

// ❌ Wrong — this.prisma.raw is correct but calling delete still throws
await this.prisma.raw.user.delete({ where: { id: userId } });
```

**Why `prisma.raw`?** The `softDelete()` helper calls `.update()` to set `deletedAt`. The extended `prisma.client` injects `{ deletedAt: null }` into every `update` where clause, which would make it fail to find the already-deleted record during repeated calls. Using `prisma.raw` bypasses that filter for this specific operation.

---

## Restoring a Soft-Deleted Record

```typescript
import { softRestore } from 'src/common/utils/soft-delete.extension';

// ✅ Correct — must use prisma.raw because extension filters deleted rows
await softRestore(this.prisma.raw.user, userId);

// ❌ Wrong — prisma.client cannot see deleted rows at all
await softRestore(this.prisma.client.user, userId);
```

---

## Pre-Create Conflict Check (Re-Registration Pattern)

Before creating any record on a soft-delete model, check whether a soft-deleted record already exists with the same unique fields. This is required to give the user a meaningful response.

```typescript
import { assertNoActiveConflict } from 'src/common/utils/soft-delete.extension';

async createUser(dto: CreateUserDto) {
  // Step 1: Check for conflicts before inserting
  const { deletedRecordId, deletedAt } = await assertNoActiveConflict({
    rawClient: this.prisma.raw,
    model: 'User',
    fields: [
      { field: 'email',  value: dto.email,  label: 'email address' },
      { field: 'phone',  value: dto.phone,  label: 'phone number'  },
    ],
    additionalWhere: { schemaName: dto.schemaName },
  });

  // Step 2a: If deletedRecordId exists → a soft-deleted record with this
  // email/phone exists. You can either:
  //   - Throw a 409 with a restore hint (recommended for admin flows)
  //   - Silently create a fresh record (partial index allows it)
  if (deletedRecordId) {
    throw new ConflictException({
      message: `A previously deleted user with this email exists.`,
      action: 'restore',
      deletedRecordId,
      deletedAt,
    });
  }

  // Step 2b: No conflict — safe to create
  return this.prisma.client.user.create({ data: { ...dto } });
}
```

**Conflict resolution table:**

| What `assertNoActiveConflict` finds | Result |
|---|---|
| Active record with same unique field | Throws `ConflictException` (409) — standard duplicate |
| Soft-deleted record with same unique field | Returns `{ deletedRecordId, deletedAt }` — caller decides |
| Nothing found | Returns `{}` — safe to create |

---

## Admin: Querying Deleted Records

Only super admin audit/restore screens should ever query deleted records:

```typescript
// ✅ Correct — use prisma.raw with explicit deletedAt filter
const deletedUsers = await this.prisma.raw.user.findMany({
  where: { deletedAt: { not: null }, schemaName: schoolSchema },
  orderBy: { deletedAt: 'desc' },
});

// ❌ Wrong — prisma.client always returns only active records
const deletedUsers = await this.prisma.client.user.findMany({
  where: { deletedAt: { not: null } }, // ← this filter is overridden to null by extension
});
```

**Why:** The extension overrides any `deletedAt` filter in `prisma.client` queries with `{ deletedAt: null }`. To see deleted records you must use `prisma.raw`.
