import { IsString, IsOptional, IsNotEmpty } from "class-validator";

export class GoogleAuthDto {
  @IsString()
  @IsNotEmpty()
  idToken: string; // Google ID token obtained from the mobile SDK

  @IsString()
  @IsOptional()
  evanAddress?: string; // optional — user can set later via profile update
}

export class AppleAuthDto {
  @IsString()
  @IsNotEmpty()
  identityToken: string; // Apple identity token (JWT) from native SDK

  @IsString()
  @IsNotEmpty()
  authorizationCode: string; // Apple authorization code

  @IsString()
  @IsOptional()
  fullName?: string; // Apple only sends this on the FIRST sign-in

  @IsString()
  @IsOptional()
  evanAddress?: string; // optional — user can set later
}
