import { IsString, IsOptional } from 'class-validator';

export class BuyerRegisterDto {
  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;
}
