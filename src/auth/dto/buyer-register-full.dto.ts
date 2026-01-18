import { IsEmail, IsString, MinLength } from "class-validator";

export class BuyerRegisterFullDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  fullName: string;

  @IsString()
  phone: string;

  @IsString()
  gender: string;

  @IsString()
  nidFontPhotoUrl: string;

  @IsString()
  nidBackPhotoUrl: string;

  @IsString()
  profilePhotoUrl: string;

  @IsString()
  fulllName: string;
  @IsString()
  nidNumber: string;
}
