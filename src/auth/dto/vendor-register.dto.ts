// vendor-register.dto.ts
import { IsString, IsEmail, IsOptional } from "class-validator";

export class VendorRegisterDto {
  @IsString()
  fullName: string;

  @IsString()
  phone: string;

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
  nationalIdNumber: string;

  @IsString()
  bussinessRegNumber: string;

  @IsString()
  country: string;
  // Remove the URL fields - we'll upload files instead
  // logoUrl, nidFontPhotoUrl, nidBackPhotoUrl, bussinessIdPhotoUrl will be uploaded
}
