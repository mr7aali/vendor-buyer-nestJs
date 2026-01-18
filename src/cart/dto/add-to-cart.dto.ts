import { IsUUID, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({
    description: 'Product ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    description: 'Quantity to add to cart',
    example: 2,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  quantity: number;
}
