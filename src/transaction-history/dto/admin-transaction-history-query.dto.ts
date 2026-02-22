import { IsOptional, IsString } from "class-validator";
import { TransactionHistoryQueryDto } from "./transaction-history-query.dto";

export class AdminTransactionHistoryQueryDto extends TransactionHistoryQueryDto {
  @IsOptional()
  @IsString()
  buyerId?: string;

  @IsOptional()
  @IsString()
  vendorId?: string;
}
