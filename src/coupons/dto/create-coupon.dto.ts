import { IsString, IsNotEmpty, IsEnum, IsNumber, Min, IsOptional, IsDateString } from 'class-validator';

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsEnum(DiscountType)
  @IsNotEmpty()
  discountType: DiscountType;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  discountValue: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minPurchaseAmount?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  usageLimit?: number;

  @IsDateString()
  @IsNotEmpty()
  validFrom: string;

  @IsDateString()
  @IsNotEmpty()
  validUntil: string;
}
