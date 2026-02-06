import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";

// ============= REQUEST DTOs =============
export enum TimeRange {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  YEARLY = "yearly",
}

export class AnalyticsQueryDto {
  @ApiProperty({
    enum: TimeRange,
    default: TimeRange.MONTHLY,
    description: "Time range for analytics data",
  })
  @IsEnum(TimeRange)
  @IsOptional()
  timeRange?: TimeRange = TimeRange.MONTHLY;

  @ApiPropertyOptional({
    description: "Optional vendor ID to filter analytics",
  })
  @IsString()
  @IsOptional()
  vendorId?: string;
}

// ============= REVENUE CHART DATA =============
export class RevenueDataPoint {
  @ApiProperty({ example: "Jan" })
  name: string;

  @ApiProperty({ example: 15000 })
  revenue: number;

  @ApiProperty({ example: 4500 })
  profit: number;
}

export class RevenueChartResponse {
  @ApiProperty({ type: [RevenueDataPoint] })
  data: RevenueDataPoint[];

  @ApiProperty({ example: 180000 })
  totalRevenue: number;

  @ApiProperty({ example: 15 })
  totalRevenueChange: number;
}

// ============= USER GROWTH CHART DATA =============
export class UserGrowthDataPoint {
  @ApiProperty({ example: "Mon" })
  name: string;

  @ApiProperty({ example: 400 })
  buyers: number;

  @ApiProperty({ example: 45 })
  vendors: number;
}

export class UserGrowthChartResponse {
  @ApiProperty({ type: [UserGrowthDataPoint] })
  data: UserGrowthDataPoint[];

  @ApiProperty({ example: 12450 })
  totalUsers: number;

  @ApiProperty({ example: 24 })
  totalUsersChange: number;
}

// ============= ORDER GROWTH CHART DATA =============
export class OrderGrowthDataPoint {
  @ApiProperty({ example: "Mon" })
  name: string;

  @ApiProperty({ example: 120 })
  orders: number;
}

export class OrderGrowthChartResponse {
  @ApiProperty({ type: [OrderGrowthDataPoint] })
  data: OrderGrowthDataPoint[];
}

// ============= SALES DISTRIBUTION DATA =============
export class CategoryData {
  @ApiProperty({ example: "Electronics" })
  name: string;

  @ApiProperty({ example: 45000 })
  value: number;

  @ApiProperty({ example: "#278687" })
  color: string;

  @ApiProperty({ example: "+12%" })
  growth: string;

  @ApiProperty({ example: "Phones, Laptops & Accessories" })
  description: string;
}

export class SalesDistributionResponse {
  @ApiProperty({ type: [CategoryData] })
  data: CategoryData[];
}

// ============= COMPLETE ANALYTICS RESPONSE =============
export class CompleteAnalyticsResponse {
  @ApiProperty()
  revenue: RevenueChartResponse;

  @ApiProperty()
  users: UserGrowthChartResponse;

  @ApiProperty()
  orders: OrderGrowthChartResponse;

  @ApiProperty()
  categories: SalesDistributionResponse;
}
