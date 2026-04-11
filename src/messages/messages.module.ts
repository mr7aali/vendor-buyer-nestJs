import { Module } from "@nestjs/common";
import { MessagesService } from "./messages.service";
import { MessagesController } from "./messages.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { MessagesGateway } from "./messages.gateway";
import { AuthModule } from "src/auth/auth.module";
import { CloudinaryModule } from "src/cloudinary/cloudinary.module";

@Module({
  imports: [PrismaModule, AuthModule, CloudinaryModule],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesGateway],
  exports: [MessagesService, MessagesGateway],
})
export class MessagesModule {}
