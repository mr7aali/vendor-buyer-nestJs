// buyer-register-full.dto.ts
import { IsEmail, IsString } from "class-validator";

export class BuyerRegisterFullDto {
  @IsEmail()
  email: string;

  @IsString()
  fullName: string;

  @IsString()
  phone: string;

  @IsString()
  gender: string;

  @IsString()
  nidNumber: string;

  // Remove these - we'll upload files instead:
  // nidFontPhotoUrl, nidBackPhotoUrl, profilePhotoUrl
  // password - user is already authenticated via JWT
}
