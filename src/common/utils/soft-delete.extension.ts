/**
 * soft-delete.extension.ts
 *
 * Prisma client extension that transparently enforces soft-delete across
 * the entire application. Any model that carries a `deletedAt` column is
 * protected automatically — no per-query `where: { deletedAt: null }` needed.
 *
 * HOW IT WORKS
 * ────────────
 * Prisma's `$extends` client-extension API intercepts every query at the
 * client level (before Prisma builds SQL), injecting the soft-delete filter.
 *
 * RULES
 * ─────
 *  • findMany / findFirst / findFirstOrThrow / findUnique / findUniqueOrThrow
 *    → always appends `{ deletedAt: null }` to the where clause.
 *  • count / aggregate / groupBy
 *    → same, so counts never include soft-deleted rows.
 *  • update / updateMany
 *    → appends `{ deletedAt: null }` so you cannot accidentally update a
 *      soft-deleted record.
 *  • delete / deleteMany
 *    → BLOCKED. Hard deletes are forbidden. Use softDelete() instead.
 *
 * BYPASSING (rare, admin-only)
 * ─────────────────────────────
 * Use `prisma.raw` (the unextended PrismaService) for restore/audit screens.
 */

import { ConflictException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

// ─── Models that support soft delete ────────────────────────────────────────
// Add new model names here as you build tenant tables (Student, Teacher, etc.)
export const SOFT_DELETE_MODELS: Prisma.ModelName[] = [
  'User',
  'UserProfile',
  'School',
  'SchoolBankAccount',
];

// ─── Query categories ────────────────────────────────────────────────────────
const READ_OPS = [
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
] as const;

const WRITE_OPS = ['update', 'updateMany'] as const;
const HARD_DELETE_OPS = ['delete', 'deleteMany'] as const;

// ─── Extension factory ───────────────────────────────────────────────────────
export function softDeleteExtension() {
  return Prisma.defineExtension((client) => {
    return client.$extends({
      name: 'soft-delete',
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const isSoftDeleteModel =
              model && SOFT_DELETE_MODELS.includes(model);

            if (!isSoftDeleteModel) return query(args);

            // Block hard deletes completely
            if (HARD_DELETE_OPS.includes(operation as any)) {
              throw new Error(
                `Hard delete is disabled on "${model}". Use softDelete() instead.`,
              );
            }

            // Inject deletedAt IS NULL filter for all reads and writes
            if (
              READ_OPS.includes(operation as any) ||
              WRITE_OPS.includes(operation as any)
            ) {
              const typedArgs = args as { where?: Record<string, unknown> };
              typedArgs.where = { ...typedArgs.where, deletedAt: null };
            }

            return query(args);
          },
        },
      },
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SOFT DELETE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

type AnyPrismaDelegate = {
  update: (args: any) => Promise<any>;
  findFirst: (args: any) => Promise<any>;
};

/**
 * Soft-deletes a record by setting deletedAt = now() and recording who deleted it.
 *
 * @example
 *   await softDelete(this.prisma.raw.user, userId, actorId);
 *   await softDelete(this.prisma.raw.school, schoolId, adminId);
 *
 * NOTE: Pass `prisma.raw` (unextended client) so the update is not filtered.
 */
export async function softDelete(
  delegate: AnyPrismaDelegate,
  id: string,
  deletedBy?: string,
): Promise<unknown> {
  return delegate.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      ...(deletedBy ? { deletedBy } : {}),
    },
  });
}

/**
 * Restores a soft-deleted record by clearing deletedAt and deletedBy.
 *
 * @example
 *   await softRestore(this.prisma.raw.user, userId);
 *
 * NOTE: Must use `prisma.raw` — the extended client filters out deleted rows.
 */
export async function softRestore(
  delegate: AnyPrismaDelegate,
  id: string,
): Promise<unknown> {
  return delegate.update({
    where: { id },
    data: { deletedAt: null, deletedBy: null },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// RE-REGISTRATION CONFLICT HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export type UniqueConflictCheckOptions = {
  /** The raw (unextended) Prisma client to search deleted records */
  rawClient: PrismaClient;
  /** Model name for error messages */
  model: string;
  /**
   * The unique field(s) that might conflict. Each entry is checked
   * independently. The first match found determines the conflict type.
   *
   * @example
   *   fields: [
   *     { field: 'email', value: 'john@school.com', label: 'email address' },
   *     { field: 'phone', value: '+8801700000000', label: 'phone number' },
   *   ]
   */
  fields: Array<{ field: string; value: unknown; label: string }>;
  /**
   * Additional where clause (e.g. schemaName) applied to every lookup.
   */
  additionalWhere?: Record<string, unknown>;
};

export type ConflictCheckResult =
  | { type: 'clear' } // No conflict at all — safe to create
  | { type: 'active_conflict'; field: string; label: string } // Active record exists → throw 409
  | {
      type: 'deleted_conflict'; // Soft-deleted record exists → offer restore
      field: string;
      label: string;
      deletedRecordId: string;
      deletedAt: Date;
    };

/**
 * Checks for unique field conflicts before creating a new record.
 *
 * Distinguishes between:
 *  A) An ACTIVE record with the same unique field → 409 Conflict (normal dupe)
 *  B) A SOFT-DELETED record with the same unique field → 409 with restore hint
 *  C) No conflict → safe to proceed with creation
 *
 * USAGE IN YOUR SERVICE:
 * ─────────────────────
 *   const conflict = await checkUniqueConflict({
 *     rawClient: this.prisma.raw,
 *     model: 'User',
 *     fields: [
 *       { field: 'email', value: dto.email, label: 'email address' },
 *       { field: 'phone', value: dto.phone, label: 'phone number' },
 *     ],
 *     additionalWhere: { schemaName: dto.schemaName },
 *   });
 *
 *   if (conflict.type === 'active_conflict') {
 *     throw new ConflictException(`A user with this ${conflict.label} already exists.`);
 *   }
 *
 *   if (conflict.type === 'deleted_conflict') {
 *     throw new ConflictException({
 *       message: `A previously deleted user with this ${conflict.label} exists.`,
 *       action: 'restore',
 *       deletedRecordId: conflict.deletedRecordId,
 *       deletedAt: conflict.deletedAt,
 *     });
 *   }
 *
 *   // type === 'clear' → safe to create
 */
export async function checkUniqueConflict(
  opts: UniqueConflictCheckOptions,
): Promise<ConflictCheckResult> {
  const { rawClient, model, fields, additionalWhere = {} } = opts;

  // @ts-expect-error — dynamic model access
  const delegate = rawClient[model.charAt(0).toLowerCase() + model.slice(1)];

  for (const { field, value, label } of fields) {
    if (value === undefined || value === null) continue;

    // Check for ACTIVE record (deletedAt IS NULL)
    const activeRecord = await delegate.findFirst({
      where: { [field]: value, ...additionalWhere, deletedAt: null },
      select: { id: true },
    });

    if (activeRecord) {
      return { type: 'active_conflict', field, label };
    }

    // Check for SOFT-DELETED record (deletedAt IS NOT NULL)
    const deletedRecord = await delegate.findFirst({
      where: {
        [field]: value,
        ...additionalWhere,
        deletedAt: { not: null },
      },
      select: { id: true, deletedAt: true },
      orderBy: { deletedAt: 'desc' }, // most recently deleted first
    });

    if (deletedRecord) {
      return {
        type: 'deleted_conflict',
        field,
        label,
        deletedRecordId: deletedRecord.id,
        deletedAt: deletedRecord.deletedAt as Date,
      };
    }
  }

  return { type: 'clear' };
}

/**
 * Convenience wrapper that throws NestJS ConflictException automatically.
 * Returns the deletedRecordId if a soft-deleted conflict was found.
 *
 * USAGE:
 *   const deletedId = await assertNoUniqueConflict({ ... });
 *   // If control reaches here, no ACTIVE conflict — safe to create.
 *   // If deletedId is returned, you can offer the user to restore it.
 *
 * @throws ConflictException if an active record with the same unique field exists.
 */
export async function assertNoActiveConflict(
  opts: UniqueConflictCheckOptions,
): Promise<{ deletedRecordId?: string; deletedAt?: Date }> {
  const result = await checkUniqueConflict(opts);

  if (result.type === 'active_conflict') {
    throw new ConflictException(
      `A user with this ${result.label} already exists.`,
    );
  }

  if (result.type === 'deleted_conflict') {
    // Return the deleted record info — the caller can decide to restore
    // or create fresh (with the partial index allowing it)
    return {
      deletedRecordId: result.deletedRecordId,
      deletedAt: result.deletedAt,
    };
  }

  return {};
}
