import { Module } from "@nestjs/common";
// import { VendorBuyerConnectionsService } from './vendor-buyer-connections.service';
// import { VendorBuyerConnectionsController } from './vendor-buyer-connections.controller';
import { PrismaModule } from "src/prisma/prisma.module.js";
import { VendorBuyerConnectionsController } from "./vendor-buyer-connections.controller.js";
import { VendorBuyerConnectionsService } from "./vendor-buyer-connections.service.js";
// import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VendorBuyerConnectionsController],
  providers: [VendorBuyerConnectionsService],
  exports: [VendorBuyerConnectionsService],
})
export class VendorBuyerConnectionsModule {}
