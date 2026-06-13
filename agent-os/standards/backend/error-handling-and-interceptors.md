# Error Handling and Interceptors

## Global Response Formatting

All successful HTTP responses are intercepted by the `ResponseInterceptor` and mapped into a standard JSON envelope: `{ success: true, statusCode, message, data, meta }`. Controllers must return raw data and not manually construct this envelope.

```typescript
// ✅ Correct
@Get()
findAll() {
  // Returns raw array. Interceptor wraps it in { success: true, data: [...] }
  return this.usersService.findAll(); 
}

// ❌ Wrong
@Get()
findAll(@Res() res: Response) {
  const users = this.usersService.findAll();
  return res.json({ success: true, data: users });
}
```

**Why:** It ensures the frontend client always receives a predictable JSON structure. It also frees developers from having to manually build this envelope in every single controller method, keeping controller code clean and focused on just returning the core data.

## Global Exception Filter

All unhandled exceptions and NestJS `HttpException`s are caught by the `GlobalExceptionFilter` and formatted into a consistent error envelope: `{ success: false, statusCode, message, errors }`. This filter specifically intercepts `class-validator` arrays and maps them to the `errors` property.

```typescript
// ✅ Correct
if (!user) {
  // Filter will catch this and format as { success: false, statusCode: 404, message: "User not found" }
  throw new NotFoundException('User not found');
}
```

**Why:** It provides a uniform error shape for the frontend to consume. By handling `class-validator` structures globally, the frontend can easily map form validation errors to specific UI fields without writing custom parsing logic for different types of backend failures.
