import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class BuyerRegisterDto {
  @ApiPropertyOptional({
    description: 'Shipping address',
    example: '123 Main Street',
  })
  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'New York',
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    description: 'Postal/ZIP code',
    example: '10001',
  })
  @IsString()
  @IsOptional()
  postalCode?: string;
}
