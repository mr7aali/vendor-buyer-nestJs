import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "src/prisma/prisma.service";

/**
 * Admin JWT Strategy
 * Validates admin JWT tokens and attaches admin data to the request
 */
@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, "admin-jwt") {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get("JWT_ADMIN_SECRET") || "JWT_ADMIN_SECRET",
    });
  }

  async validate(payload: any) {
    // Verify it's an admin token
    if (payload.type !== "ADMIN") {
      throw new UnauthorizedException("Invalid admin token");
    }

    // Fetch the latest admin data with permissions
    const admin = await this.prisma.admin.findUnique({
      where: { id: payload.sub },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!admin) {
      throw new UnauthorizedException("Admin not found");
    }

    // Return admin data that will be attached to request.user
    return {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      type: "ADMIN",
      permissions: admin.permissions.map((p) => p.permission.key),
    };
  }
}
