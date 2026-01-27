// auth/dto/create-super-admin.dto.ts
import { IsEmail, IsString, MinLength } from "class-validator";

export class CreateSuperAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  secret: string; // bootstrap secret
}
