import {
  IsOptional,
  IsInt,
  Min,
  IsString,
  IsBoolean,
  IsEnum,
} from "class-validator";
import { Transform, Type } from "class-transformer";

export enum VendorSortBy {
  CREATED_AT = "createdAt",
  FULL_NAME = "fullName",
  STORE_NAME = "storename",
  REVENUE = "revenue",
  RATING = "rating",
  TOTAL_ORDERS = "totalOrders",
}

export class GetAllVendorsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  vendorCode?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  isActive?: string;

  @IsOptional()
  @IsEnum(VendorSortBy)
  sortBy?: VendorSortBy = VendorSortBy.CREATED_AT;

  @IsOptional()
  @IsString()
  sortOrder?: "asc" | "desc" = "desc";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minRevenue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxRevenue?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  minRating?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  maxRating?: number;

  @IsOptional()
  @IsString()
  businessName?: string;
}
