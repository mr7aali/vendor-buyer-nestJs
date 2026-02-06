import { Module } from "@nestjs/common";
import { ChattingWithAdminService } from "./chatting-with-admin.service";
import { ChattingWithAdminController } from "./chatting-with-admin.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { ChattingWithAdminGateway } from "./chatting-with-admin.gateway";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ChattingWithAdminController],
  providers: [ChattingWithAdminService, ChattingWithAdminGateway],
  exports: [ChattingWithAdminService],
})
export class ChattingWithAdminModule {}
