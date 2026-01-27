import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";
import { Reflector } from "@nestjs/core";

// auth/guards/permission.guard.ts
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      PERMISSIONS_KEY,
      context.getHandler(),
    );

    if (!requiredPermissions) return true;

    const request = context.switchToHttp().getRequest();
    const admin = request.user;

    return requiredPermissions.every((p) => admin.permissions?.includes(p));
  }
}
