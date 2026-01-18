import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsBoolean, IsUUID } from 'class-validator';

export class CreateProductDto {
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  price: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  stockQuantity: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}
