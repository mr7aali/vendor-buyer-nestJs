import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserType } from "../auth/dto/register.dto";
import { AdminAuthGuard } from "../auth/guards/admin-auth.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AdminTransactionHistoryQueryDto } from "./dto/admin-transaction-history-query.dto";
import { TransactionHistoryQueryDto } from "./dto/transaction-history-query.dto";
import { TransactionHistoryService } from "./transaction-history.service";

@Controller("transaction-history")
export class TransactionHistoryController {
  constructor(
    private readonly transactionHistoryService: TransactionHistoryService,
  ) {}

  @Get("buyer")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.BUYER)
  async getBuyerTransactionHistory(
    @GetUser() user: { id: string },
    @Query() query: TransactionHistoryQueryDto,
  ) {
    return this.transactionHistoryService.getBuyerTransactionHistory(
      user.id,
      query,
    );
  }

  @Get("vendor")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.VENDOR)
  async getVendorTransactionHistory(
    @GetUser() user: { id: string },
    @Query() query: TransactionHistoryQueryDto,
  ) {
    return this.transactionHistoryService.getVendorTransactionHistory(
      user.id,
      query,
    );
  }

  @Get("admin")
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions("transactions.view")
  async getAdminTransactionHistory(
    @Query() query: AdminTransactionHistoryQueryDto,
  ) {
    return this.transactionHistoryService.getAdminTransactionHistory(query);
  }
}
