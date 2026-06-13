# Authentication and Guards

## API Key Global Guard

Every request to the backend must pass the `ApiKeyGuard` (applied globally in `main.ts`). Requests must include an `x-api-key` header matching a registered client application in the database.

```typescript
// ✅ Correct (in main.ts)
app.useGlobalGuards(app.get(ApiKeyGuard));
```

**Why:** Because this backend is designed as an internal microservice or proxy target. The API key ensures that only our official Next.js frontend proxy (or approved client applications) can hit the backend endpoints, preventing direct public access to the raw APIs.

## JWT and Permission Guards

Protected endpoints must use `@UseGuards(JwtAuthGuard, PermissionsGuard)` and declare required permissions using the `@RequirePermissions` decorator. The user must possess at least one of the specified permissions to access the route.

```typescript
// ✅ Correct
@Get('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('view_reports', 'admin_all')
getReports() {
  return "Reports data";
}

// ❌ Wrong: Missing PermissionsGuard or just checking roles
@Get('reports')
@UseGuards(JwtAuthGuard)
getReports() {
  return "Reports data";
}
```

**Why:** Because combining both ensures an endpoint is fully secured. `JwtAuthGuard` guarantees the caller is a valid logged-in user, but doesn't check their rights. `PermissionsGuard` paired with `@RequirePermissions` enforces fine-grained access control based on their specific permissions in the database, preventing horizontal and vertical privilege escalation.

