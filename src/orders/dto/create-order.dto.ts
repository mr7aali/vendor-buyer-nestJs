import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({
    description: 'Vendor ID (UUID) - All items in cart from this vendor will be ordered',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  vendorId: string;

  @ApiProperty({
    description: 'Shipping address for the order',
    example: '123 Main Street, New York, NY 10001',
  })
  @IsString()
  @IsNotEmpty()
  shippingAddress: string;

  @ApiPropertyOptional({
    description: 'Optional coupon code for discount',
    example: 'SAVE10',
  })
  @IsString()
  @IsOptional()
  couponCode?: string;
}
