# Multi-Tenancy and Database Standards

## Tenant Middleware Detection

The application determines the current tenant schema dynamically for every request via the global `TenantMiddleware`. It follows a strict extraction priority:
1. **JWT Claim** (`decoded.schema`): Highest priority, used for authenticated requests.
2. **Host Header**: Subdomain extraction when accessed directly.
3. **Origin Header**: Subdomain extraction when accessed via a cross-origin frontend.

```typescript
// ✅ Correct: Access the tenant via the Request object in middleware/guards
const tenant = req.tenant;

// ❌ Wrong: Manually parsing headers to find the tenant in controllers
const tenant = req.headers['x-tenant-id'];
```

**Why:** This ensures a seamless multi-tenant experience regardless of how the API is accessed. Relying on the JWT claim prioritizes authenticated context (preventing spoofing), while falling back to Host/Origin headers allows public routes (like school registration or public APIs) to correctly identify the tenant from the URL before a token exists.

## Request-Scoped Prisma Client

Database access must go through `TenantConnectionService` (which is request-scoped) rather than a global `PrismaService`, to ensure queries are routed to the correct PostgreSQL schema (`?schema=tenantSchema`).

```typescript
// ✅ Correct
@Injectable()
export class UsersService {
  constructor(private tenantConnection: TenantConnectionService) {}

  async findAll() {
    const prisma = this.tenantConnection.getTenantClient();
    return prisma.user.findMany();
  }
}

// ❌ Wrong: Will query the default 'public' schema or cause leaks
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany();
  }
}
```

**Why:** Because PostgreSQL schema-based multi-tenancy requires queries to execute against a specific schema (e.g., `?schema=sylhet_gov_college`). If we used a global Prisma Client, queries from different tenants could leak into each other. By caching and scoping Prisma to the request via `TenantConnectionService`, we guarantee 100% data isolation for each school.

