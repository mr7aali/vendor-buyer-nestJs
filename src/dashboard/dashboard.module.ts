import { Module } from "@nestjs/common";
// import { AdminDashboardController } from "./admin-dashboard.controller";
// import { AdminDashboardService } from "./admin-dashboard.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AdminDashboardController } from "./dashboard.controller";
import { AdminDashboardService } from "./dashboard.service";

@Module({
  imports: [PrismaModule],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService],
  exports: [AdminDashboardService],
})
export class AdminDashboardModule {}
