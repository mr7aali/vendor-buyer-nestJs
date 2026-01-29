// DTOs
import {
  IsOptional,
  IsEnum,
  IsString,
  IsInt,
  Min,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";

export class GetAllUsersQueryDto {
  // Pagination
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  // Filters
  @IsOptional()
  @IsEnum(["vendor", "buyer", "user"])
  userType?: "vendor" | "buyer" | "user";

  @IsOptional()
  @IsString()
  search?: string; // Search by email or name

  @IsOptional()
  @IsEnum(["male", "female", "other"])
  gender?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean; // For vendors only

  @IsOptional()
  @IsString()
  vendorCode?: string; // Search by vendor code

  // Sorting
  @IsOptional()
  @IsEnum(["createdAt", "updatedAt", "email", "index"])
  sortBy?: string = "createdAt";

  @IsOptional()
  @IsEnum(["asc", "desc"])
  sortOrder?: "asc" | "desc" = "desc";

  // Include options
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeMessages?: boolean = false;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeNotifications?: boolean = false;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeCount?: boolean = true;
}
