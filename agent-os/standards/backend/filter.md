# List Filtering & Pagination Queries

When handling list endpoints (e.g. `findAll`) that accept complex array query filters, ensure they are correctly parsed and passed to Prisma.

## Controller Normalization

Express and NestJS may parse query arrays inconsistently based on URL formatting. For multi-option filters (e.g., selecting multiple billing cycles or modules), always expect the client to send a **comma-separated string** (e.g. `?billingCycle=monthly,annual`).

In the Service layer, split the string by commas and apply the array filter to the Prisma query using `in` (for scalar fields) or `hasSome` (for arrays of strings/enums).

```typescript
@Get()
findAll(
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 10,
  @Query('billingCycle') billingCycle?: string, // Comma-separated string
) {
  return this.service.findAll(page, limit, billingCycle);
}
```

## Prisma Array Filtering

```typescript
async findAll(page: number = 1, limit: number = 10, billingCycle?: string) {
  const where: any = {};
  
  if (billingCycle) {
    where.billingCycle = { in: billingCycle.split(',') };
  }

  // ... execute prisma findMany
}
```
