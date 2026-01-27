import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";

/**
 * Admin Authentication Guard
 * Validates that the request has a valid admin JWT token
 * Should be used on all admin endpoints
 */
@Injectable()
export class AdminAuthGuard extends AuthGuard("admin-jwt") {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest(err: any, admin: any, info: any) {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || !admin) {
      throw err || new UnauthorizedException("Admin authentication required");
    }

    // Ensure the user is actually an admin
    if (!admin.type || admin.type !== "ADMIN") {
      throw new UnauthorizedException("Admin access required");
    }

    return admin;
  }
}
