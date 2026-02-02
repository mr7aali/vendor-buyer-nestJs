import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";

import { AdminAuthGuard } from "../auth/guards/admin-auth.guard";
import { AdminDashboardService } from "./dashboard.service";
import {
  ActionItemDto,
  ActivityItemDto,
  DashboardOverviewDto,
  DashboardQueryDto,
  KPIMetricsDto,
  OrderFulfillmentDto,
  SupportVolumeDto,
  SystemHealthDto,
  WeeklyRevenueDataDto,
  WeeklyUserDataDto,
} from "./dashboard.dto";
import { DashboardQueryClsDto } from "./dto/dashboard-query.dto";

@ApiTags("Admin Dashboard")
@ApiBearerAuth()
@Controller("admin/dashboard")
@UseGuards(AdminAuthGuard)
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}
  /**
   * Get complete dashboard overview
   * This is the main endpoint that returns all dashboard data
   */
  @Get("overview")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get complete dashboard overview" })
  @ApiResponse({
    status: 200,
    description: "Dashboard overview retrieved successfully",
    type: DashboardQueryClsDto,
  })
  async getDashboardOverview(@Query() query: DashboardQueryClsDto) {
    return this.dashboardService.getDashboardOverview(query);
  }

  /**
   * Get KPI metrics only
   */
  @Get("kpi-metrics")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get KPI metrics" })
  @ApiResponse({
    status: 200,
    description: "KPI metrics retrieved successfully",
    type: KPIMetricsDto,
  })
  async getKPIMetrics(@Query("days") days: number = 7): Promise<KPIMetricsDto> {
    return this.dashboardService.getKPIMetrics(days);
  }

  /**
   * Get system health status
   */
  @Get("system-health")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get system health status" })
  @ApiResponse({
    status: 200,
    description: "System health retrieved successfully",
    type: SystemHealthDto,
  })
  async getSystemHealth(): Promise<SystemHealthDto> {
    return this.dashboardService.getSystemHealth();
  }

  /**
   * Get order fulfillment statistics
   */
  @Get("order-fulfillment")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get order fulfillment statistics" })
  @ApiResponse({
    status: 200,
    description: "Order fulfillment stats retrieved successfully",
    type: OrderFulfillmentDto,
  })
  async getOrderFulfillment(): Promise<OrderFulfillmentDto> {
    return this.dashboardService.getOrderFulfillment();
  }

  /**
   * Get support volume statistics
   */
  @Get("support-volume")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get support volume statistics" })
  @ApiResponse({
    status: 200,
    description: "Support volume retrieved successfully",
    type: SupportVolumeDto,
  })
  async getSupportVolume(): Promise<SupportVolumeDto> {
    return this.dashboardService.getSupportVolume();
  }

  /**
   * Get weekly revenue data for charts
   */
  @Get("weekly-revenue")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get weekly revenue data" })
  @ApiResponse({
    status: 200,
    description: "Weekly revenue data retrieved successfully",
    type: [WeeklyRevenueDataDto],
  })
  async getWeeklyRevenue(
    @Query("days") days: number = 7,
  ): Promise<WeeklyRevenueDataDto[]> {
    return this.dashboardService.getWeeklyRevenue(days);
  }

  /**
   * Get weekly user growth data for charts
   */
  @Get("weekly-users")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get weekly user growth data" })
  @ApiResponse({
    status: 200,
    description: "Weekly user data retrieved successfully",
    type: [WeeklyUserDataDto],
  })
  async getWeeklyUsers(
    @Query("days") days: number = 7,
  ): Promise<WeeklyUserDataDto[]> {
    return this.dashboardService.getWeeklyUsers(days);
  }

  /**
   * Get recent activity feed
   */
  @Get("recent-activity")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get recent activity feed" })
  @ApiResponse({
    status: 200,
    description: "Recent activity retrieved successfully",
    type: [ActivityItemDto],
  })
  async getRecentActivity(
    @Query("limit") limit: number = 10,
  ): Promise<ActivityItemDto[]> {
    return this.dashboardService.getRecentActivity(limit);
  }

  /**
   * Get action items that need attention
   */
  @Get("action-items")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get action items" })
  @ApiResponse({
    status: 200,
    description: "Action items retrieved successfully",
    type: [ActionItemDto],
  })
  async getActionItems(): Promise<ActionItemDto[]> {
    return this.dashboardService.getActionItems();
  }
}
