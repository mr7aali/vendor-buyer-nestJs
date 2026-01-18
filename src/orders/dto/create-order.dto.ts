import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  @IsNotEmpty()
  vendorId: string;

  @IsString()
  @IsNotEmpty()
  shippingAddress: string;

  @IsString()
  @IsOptional()
  couponCode?: string;
}
