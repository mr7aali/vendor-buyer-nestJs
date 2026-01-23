import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    description: 'Category ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Laptop Pro 15',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Product description',
    example: 'High-performance laptop with 16GB RAM and 512GB SSD',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Product price',
    example: 1299.99,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  price: number;

  @ApiProperty({
    description: 'Stock quantity available',
    example: 50,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  stockQuantity: number;

  @ApiPropertyOptional({
    description: 'Product image URL',
    example: 'https://example.com/product-image.jpg',
    format: 'uri',
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Product availability status',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}
