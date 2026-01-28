import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsArray } from "class-validator";

/**
 * DTO for creating a new employee
 */
export class CreateEmployeeDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

/**
 * DTO for updating employee permissions
 */
export class UpdateEmployeePermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}