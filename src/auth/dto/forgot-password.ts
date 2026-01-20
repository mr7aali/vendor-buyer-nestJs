import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

// import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validation";

export class ForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class VerifyOtpDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  otp: string;
}

export class ResetPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  otp: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: "Password must be at least 6 characters long" })
  newPassword: string;

  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}
