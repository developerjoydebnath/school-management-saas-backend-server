import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { PERMISSIONS_KEY } from '../../../common/decorators/permissions.decorator';
import { TenantConnectionService } from '../../../cores/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private tenantConnection: TenantConnectionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions required for this route
    }

    const request = context
      .switchToHttp()
      .getRequest<import('express').Request>();
    const user = request.user as { userId: string; role?: Role } | undefined; // Set by JwtAuthGuard's validate method

    if (!user || !user.userId) {
      throw new ForbiddenException(
        'User context not found. Make sure JwtAuthGuard runs first.',
      );
    }

    // Bypass permission check for SUPER_ADMIN and DEVELOPER
    if (user.role === Role.SUPER_ADMIN || user.role === Role.DEVELOPER) {
      return true;
    }

    const prisma = this.tenantConnection.getTenantClient();

    // Look up the user's permissions in the database
    const userPermissions = await prisma.userPermission.findMany({
      where: { userId: user.userId },
      include: { permission: true },
    });

    // Extract exactly the string keys the user possesses
    const userPermissionKeys = userPermissions.map(
      (up) => up.permission.permissionKey,
    );

    // Check if the user has ANY of the required permissions (or ALL, depending on your business logic)
    // The user requested: "if api caller user has any permission from those then he can access"
    const hasPermission = requiredPermissions.some((reqPerm) =>
      userPermissionKeys.includes(reqPerm),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Access Denied: Missing one of the required permissions: [${requiredPermissions.join(', ')}]`,
      );
    }

    return true;
  }
}
