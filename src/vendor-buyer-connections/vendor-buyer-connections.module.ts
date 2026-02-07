import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { VendorBuyerConnectionsController } from "./vendor-buyer-connections.controller";
import { VendorBuyerConnectionsService } from "./vendor-buyer-connections.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [VendorBuyerConnectionsController],
  providers: [VendorBuyerConnectionsService],
  exports: [VendorBuyerConnectionsService],
})
export class VendorBuyerConnectionsModule {}
