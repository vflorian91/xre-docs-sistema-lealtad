import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSIONS_KEY } from './require-permissions.decorator';
import { InternalAuthUser } from './auth.types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: InternalAuthUser }>();
    const userPermissions = new Set(request.user?.permissions ?? []);
    const hasAllPermissions = requiredPermissions.every((permission) => userPermissions.has(permission));

    if (!hasAllPermissions) {
      throw new ForbiddenException('No tienes permiso para realizar esta accion.');
    }

    return true;
  }
}
