// dashboard-query.dto.ts

import { IsBoolean, IsOptional, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

/**
 * DTO for Admin Dashboard query parameters
 */
export class DashboardQueryClsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  days?: number = 7; // Default last 7 days

  @IsOptional()
  @IsBoolean()
  includeCharts?: boolean = true;

  @IsOptional()
  @IsBoolean()
  includeActivity?: boolean = true;
}
