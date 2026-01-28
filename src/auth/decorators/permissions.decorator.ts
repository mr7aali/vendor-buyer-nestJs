import { SetMetadata } from "@nestjs/common";

/**
 * Permissions Decorator
 * Use this decorator to specify which permissions are required to access a route
 *
 * @example
 * @Permissions('dashboard.view', 'users.read')
 * @UseGuards(AdminAuthGuard, PermissionGuard)
 * getDashboard() {
 *   return { message: 'Dashboard data' };
 * }
 */
export const PERMISSIONS_KEY = "permissions";
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
