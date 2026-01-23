import { IsEmail, IsString, MinLength, MaxLength } from "class-validator";

export class UserRegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(32)
  password: string;

  @IsString()
  @MinLength(8)
  @MaxLength(32)
  confirmPassword: string;
}
