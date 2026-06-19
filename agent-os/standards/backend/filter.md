# List Filtering & Pagination Queries

When handling list endpoints (e.g. `findAll`) that accept complex array query filters, ensure they are correctly parsed and passed to Prisma.

## Controller Normalization

Express and NestJS may parse query arrays differently based on whether one item or multiple items were selected (e.g. `?modules=student` vs `?modules=student&modules=teacher`).

Always type array query parameters as `string | string[]` and normalize them before passing to the service.

```typescript
@Get()
findAll(
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 10,
  @Query('modules') modules?: string | string[],
) {
  const modulesArray = Array.isArray(modules)
    ? modules
    : modules
      ? [modules]
      : undefined;
      
  return this.service.findAll(page, limit, modulesArray);
}
```

## Prisma Array Filtering

In the Service layer, apply the array filter to the Prisma query using `hasSome` (for arrays of strings/enums) or `in` (for scalar fields).

```typescript
async findAll(page: number = 1, limit: number = 10, modules?: string[]) {
  const where: any = {};
  
  if (modules && modules.length > 0) {
    where.moduleName = { hasSome: modules };
  }

  // ... execute prisma findMany
}
```
