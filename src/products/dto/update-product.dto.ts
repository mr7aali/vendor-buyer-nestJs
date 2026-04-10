import { IsString, IsOptional, IsNumber, Min, IsBoolean, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiPropertyOptional({
    description: 'Category ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Product name',
    example: 'Laptop Pro 15',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Product description',
    example: 'High-performance laptop with 16GB RAM and 512GB SSD',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Product price',
    example: 1299.99,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({
    description: 'Stock quantity available',
    example: 50,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stockQuantity?: number;

  @ApiPropertyOptional({
    description: 'Minimum quantity required',
    example: 1,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minimulAuantity?: number;

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
  })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}
