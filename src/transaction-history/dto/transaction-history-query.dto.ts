import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export enum TransactionSortBy {
  CREATED_AT = "createdAt",
  AMOUNT = "amount",
  STATUS = "status",
  ORDER_NUMBER = "orderNumber",
}

export enum TransactionSortOrder {
  ASC = "asc",
  DESC = "desc",
}

export class TransactionHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  orderStatus?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxAmount?: number;

  @IsOptional()
  @IsEnum(TransactionSortBy)
  sortBy?: TransactionSortBy = TransactionSortBy.CREATED_AT;

  @IsOptional()
  @IsEnum(TransactionSortOrder)
  sortOrder?: TransactionSortOrder = TransactionSortOrder.DESC;
}
