import {
  Controller,
  Get,
  Query,
  HttpStatus,
  HttpException,
} from "@nestjs/common";
// import { AnalyticsService } from "./analytics.service";
// import {
//   AnalyticsQueryDto,
//   CompleteAnalyticsResponse,
// } from "./dto/analytics.dto";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AnalyticsQueryDto, CompleteAnalyticsResponse } from "./analytics.dto";
import { AnalyticsService } from "./analytics.service";

@ApiTags("Analytics")
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Get all analytics data needed for the dashboard
   * This matches exactly what your UI expects
   */
  @Get()
  @ApiOperation({
    summary: "Get complete analytics data for dashboard",
    description:
      "Returns revenue, user growth, order growth, and sales distribution data based on selected time range",
  })
  @ApiResponse({
    status: 200,
    description: "Returns complete analytics data matching UI structure",
    type: CompleteAnalyticsResponse,
  })
  async getAnalytics(
    @Query() query: AnalyticsQueryDto,
  ): Promise<CompleteAnalyticsResponse> {
    try {
      return await this.analyticsService.getCompleteAnalytics(query);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to fetch analytics data",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
