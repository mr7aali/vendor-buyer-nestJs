import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { TransactionHistoryController } from "./transaction-history.controller";
import { TransactionHistoryService } from "./transaction-history.service";

@Module({
  imports: [PrismaModule],
  controllers: [TransactionHistoryController],
  providers: [TransactionHistoryService],
})
export class TransactionHistoryModule {}
