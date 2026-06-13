# Controllers and DTOs

## Class-Validator DTOs

All request payloads (`@Body()`) must be strongly typed with DTO classes using `class-validator` decorators. Do not use plain TypeScript interfaces.

```typescript
// ✅ Correct
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

// ❌ Wrong
export interface CreateSessionDto {
  name: string;
}
```

**Why:** It acts as a strict boundary shield. Instead of writing custom if/else checks in every controller to verify payloads, NestJS's global validation pipe automatically parses the DTO rules and rejects bad requests with a 400 Bad Request before the code ever reaches the controller method.

## Controller Routing & Structure

Controllers should stick to RESTful route patterns (`@Get()`, `@Post()`, `@Patch(':id')`) and delegate all business logic to the service layer.

```typescript
// ✅ Correct
@Get()
findAll() {
  return this.sessionsService.findAll(); // Logic delegated
}

// ❌ Wrong
@Get('getAllData')
findAll() {
  // Complex DB logic inline...
}
```

**Why:** It keeps controllers thin and focused purely on HTTP request/response handling. Delegating logic to services makes the business logic reusable and testable without needing a mock HTTP context.

## Swagger Documentation

Controllers must use `@ApiTags()`, `@ApiOperation()`, and `@ApiQuery()` decorators to automatically generate OpenAPI documentation.

```typescript
// ✅ Correct
@ApiTags('sessions')
@Controller('sessions')
export class SessionsController {
  
  @Get()
  @ApiOperation({ summary: 'List all sessions' })
  findAll() {
    return this.sessionsService.findAll();
  }
}
```

**Why:** The API contract serves as the primary communication bridge with the frontend team. Using decorators ensures the API documentation is generated directly from the source code and never falls out of sync.
