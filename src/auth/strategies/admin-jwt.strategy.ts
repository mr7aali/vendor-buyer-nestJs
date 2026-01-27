import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

// auth/strategies/admin-jwt.strategy.ts
@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, "admin-jwt") {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey:
        config.get<string>("JWT_ADMIN_SECRET") || "default_admin_secret",
    });
  }

  async validate(payload: any) {
    if (payload.type !== "ADMIN") {
      throw new UnauthorizedException();
    }
    return payload;
  }
}
