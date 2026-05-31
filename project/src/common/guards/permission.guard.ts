/**
 * =============================================================================
 * PermissionGuard - التحقق من صلاحيات RBAC
 * =============================================================================
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

interface RequestWithUser {
  user: {
    id: string;
    email: string;
    roles: string[];
    permissions?: string[];
  };
}

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // إذا لم تكن هناك متطلبات، اسمح
    if (!requiredPermissions && !requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // التحقق من الأدوار
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.some((role) => user.roles?.includes(role));
      if (!hasRole) {
        this.logger.warn(
          'User %s denied access - required roles: %s, has: %s',
          user.id,
          requiredRoles.join(','),
          user.roles?.join(',') || 'none',
        );
        throw new ForbiddenException(`Required roles: ${requiredRoles.join(', ')}`);
      }
    }

    // التحقق من الصلاحيات
    if (requiredPermissions && requiredPermissions.length > 0) {
      const userPermissions = user.permissions || [];
      const hasAllPermissions = requiredPermissions.every((perm) =>
        userPermissions.includes(perm),
      );

      if (!hasAllPermissions) {
        const missing = requiredPermissions.filter(
          (perm) => !userPermissions.includes(perm),
        );
        this.logger.warn(
          'User %s denied access - missing permissions: %s',
          user.id,
          missing.join(','),
        );
        throw new ForbiddenException(`Missing permissions: ${missing.join(', ')}`);
      }
    }

    return true;
  }
}
