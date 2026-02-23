// DTOs
import { Type } from "class-transformer";
import {
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  ValidateNested,
} from "class-validator";

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class UpdateBuyerProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  nidNumber?: string;

  //   @IsOptional()
  //   @IsString()
  //   nidFontPhotoUrl?: string;

  //   @IsOptional()
  //   @IsString()
  //   nidBackPhotoUrl?: string;

  //   @IsOptional()
  //   @IsString()
  //   profilePhotoUrl?: string;

  @IsOptional()
  @IsEnum(["male", "female", "other"])
  gender?: string;
}

export class UpdateVendorProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  storename?: string;

  @IsOptional()
  @IsString()
  storeDescription?: string;

  @IsOptional()
  @IsEnum(["male", "female", "other"])
  gender?: string;

  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  businessDescription?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  nationalIdNumber?: string;

  @IsOptional()
  @IsString()
  nidFontPhotoUrl?: string;

  @IsOptional()
  @IsString()
  nidBackPhotoUrl?: string;

  @IsOptional()
  @IsString()
  bussinessRegNumber?: string;

  @IsOptional()
  @IsString()
  bussinessIdPhotoUrl?: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateUserDto)
  user?: UpdateUserDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateBuyerProfileDto)
  @IsOptional()
  buyer?: UpdateBuyerProfileDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateVendorProfileDto)
  vendor?: UpdateVendorProfileDto;
}
