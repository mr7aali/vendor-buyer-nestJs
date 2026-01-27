import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";

/**
 * Permission Guard
 * Checks if the admin user has the required permissions to access a route
 * Should be used after AdminAuthGuard
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required permissions from the route decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions are required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const admin = request.user;

    // Ensure admin is authenticated
    if (!admin) {
      throw new UnauthorizedException(
        "Authentication required to access this resource",
      );
    }

    // Super admins have access to everything
    if (admin.role === "SUPER_ADMIN") {
      return true;
    }

    // Check if admin has the required permissions
    const adminPermissions = admin.permissions || [];

    // Check if admin has all required permissions
    const hasAllPermissions = requiredPermissions.every((permission) =>
      adminPermissions.includes(permission),
    );

    if (!hasAllPermissions) {
      const missingPermissions = requiredPermissions.filter(
        (permission) => !adminPermissions.includes(permission),
      );

      throw new ForbiddenException(
        `You don't have the required permissions: ${missingPermissions.join(", ")}`,
      );
    }

    return true;
  }
}
