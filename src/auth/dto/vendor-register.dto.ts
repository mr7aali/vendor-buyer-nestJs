import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class VendorRegisterDto {
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @IsString()
  @IsOptional()
  businessDescription?: string;

  @IsString()
  @IsOptional()
  businessAddress?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;
}
