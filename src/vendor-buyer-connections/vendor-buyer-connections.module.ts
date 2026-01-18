import { Module } from "@nestjs/common";
import { PrismaModule } from '../prisma/prisma.module';
import { VendorBuyerConnectionsController } from "./vendor-buyer-connections.controller";
import { VendorBuyerConnectionsService } from "./vendor-buyer-connections.service";

@Module({
  imports: [PrismaModule],
  controllers: [VendorBuyerConnectionsController],
  providers: [VendorBuyerConnectionsService],
  exports: [VendorBuyerConnectionsService],
})
export class VendorBuyerConnectionsModule {}
