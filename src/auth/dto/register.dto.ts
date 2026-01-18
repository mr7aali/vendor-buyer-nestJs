import { IsEmail, IsString, MinLength, IsNotEmpty, IsEnum } from 'class-validator';

export enum UserType {
  VENDOR = 'vendor',
  BUYER = 'buyer',
}

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;

  @IsEnum(UserType)
  @IsNotEmpty()
  userType: UserType;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  phone?: string;
}
