import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  Min,
  IsOptional,
  IsDateString,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum DiscountType {
  PERCENTAGE = "percentage",
  FIXED = "fixed",
}

export class CreateCouponDto {
  @ApiProperty({
    description: "Coupon display name",
    example: "Summer Sale",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: "Type of discount",
    enum: DiscountType,
    example: DiscountType.PERCENTAGE,
  })
  @IsEnum(DiscountType)
  @IsNotEmpty()
  discountType: DiscountType;

  @ApiProperty({
    description: "Discount value (percentage or fixed amount)",
    example: 10,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  discountValue: number;

  @ApiPropertyOptional({
    description: "Minimum purchase amount to use coupon",
    example: 100,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minPurchaseAmount?: number;

  @ApiPropertyOptional({
    description: "Maximum number of times coupon can be used",
    example: 100,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  usageLimit?: number;

  @ApiProperty({
    description: "Valid from date (ISO 8601)",
    example: "2024-01-01T00:00:00Z",
    format: "date-time",
  })
  @IsOptional()
  @IsDateString()
  @IsNotEmpty()
  validFrom: string;

  @ApiProperty({
    description: "Valid until date (ISO 8601)",
    example: "2024-12-31T23:59:59Z",
    format: "date-time",
  })
  @IsDateString()
  @IsNotEmpty()
  validUntil: string;
}
