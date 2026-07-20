import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<import('express').Request>();
    const user = request.user as { userId: string; role?: Role } | undefined;

    if (!user || !user.role) {
      throw new ForbiddenException(
        'User role not found. Make sure JwtAuthGuard runs first.',
      );
    }

    const userRole = String(user.role || '').toUpperCase() as Role;
    const hasRole = requiredRoles.includes(userRole);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access Denied: Missing required role. Required: [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
