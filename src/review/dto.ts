import { Type } from "class-transformer";
import {
  IsInt,
  IsString,
  IsOptional,
  Min,
  Max,
  IsUUID,
  IsEnum,
} from "class-validator";
// import { IsInt, IsString, IsOptional, Min, Max, IsUUID } from "class-validator";
export class CreateProductReviewDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class UpdateProductReviewDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class CreateVendorReviewDto {
  @IsUUID()
  vendorId: string;

  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class UpdateVendorReviewDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

// import { IsOptional, IsInt, Min, IsString, IsEnum } from "class-validator";
// import { Type } from "class-transformer";

export enum ReviewSortBy {
  RECENT = "recent",
  RATING_HIGH = "rating_high",
  RATING_LOW = "rating_low",
}

export class GetReviewsQueryDto {
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
  @IsInt()
  @Min(1)
  @Type(() => Number)
  rating?: number; // Filter by specific rating

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ReviewSortBy)
  sortBy?: ReviewSortBy = ReviewSortBy.RECENT;

  @IsOptional()
  @IsString()
  verifiedOnly?: string; // 'true' or 'false'
}
