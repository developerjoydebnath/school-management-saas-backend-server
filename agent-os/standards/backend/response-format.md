# Response Formatting & Module Structure

## Module Definitions

In this architecture, do **NOT** use a generic barrel `PrismaModule`. All NestJS modules MUST import and provide the core `PrismaService` and `TenantConnectionService` directly in their `@Module()` decorators.

```typescript
import { Module } from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  controllers: [RolesController],
  providers: [RolesService, PrismaService, TenantConnectionService],
})
export class RolesModule {}
```

**Why:** It ensures that every module has access to the public-schema Prisma connection (`PrismaService`) and the request-scoped tenant isolation helper (`TenantConnectionService`) without circular dependency issues or missing providers.

## Standard Response Envelopes & Pagination

When returning arrays of items from a service (especially inside `findAll` methods), always implement pagination using Prisma's `skip` and `take`, running both the query and `count` simultaneously using `Promise.all`. The response object MUST contain the standard metadata fields.

List endpoints must return only the fields required by the visible table/list UI and row actions. Do not include full nested detail relationships in `findAll` just because a details UI exists. If a details sheet/page needs extra data, the frontend must call the detail endpoint by id when the user opens that details UI.

```typescript
async findAll(page: number = 1, limit: number = 10, search?: string) {
    const where: any = { /* ... */ };

    const [items, total] = await Promise.all([
        prisma.model.findMany({
            where,
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
            orderBy: { name: 'asc' },
        }),
        prisma.model.count({ where }),
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    return {
        success: true,
        statusCode: 200,
        message: 'Items retrieved successfully',
        data: {
            items,
            meta: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages,
                hasNextPage: Number(page) < totalPages,
                hasPreviousPage: Number(page) > 1,
            },
        },
        meta: null,
    };
}
```

The `meta.limit` and `meta.page` values must reflect the effective pagination values used by `skip` and `take`. Do not hardcode metadata such as `limit: 100` when the request supplied another limit like `?limit=10`.
