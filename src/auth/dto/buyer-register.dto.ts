import { IsEmail, IsOptional, IsString } from "class-validator";

export class VendorRegisterDto {
  @IsString()
  fulllName: string;

  @IsString()
  phone: string;

  @IsEmail()
  email: string;

  @IsString()
  address: string;

  @IsString()
  storename: string;

  @IsString()
  storeDescription: string;

  @IsString()
  gender: string;

  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  businessDescription?: string;

  @IsString()
  logoUrl: string;

  @IsString()
  nationalIdNumber: string;

  @IsString()
  nidFontPhotoUrl: string;

  @IsString()
  nidBackPhotoUrl: string;

  @IsString()
  bussinessRegNumber: string;

  @IsString()
  bussinessIdPhotoUrl: string;
}
