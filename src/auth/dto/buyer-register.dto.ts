import { IsString, IsOptional } from "class-validator";
// import { ApiPropertyOptional } from '@nestjs/swagger';

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
