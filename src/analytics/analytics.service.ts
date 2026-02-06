import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  AnalyticsQueryDto,
  CategoryData,
  CompleteAnalyticsResponse,
  OrderGrowthChartResponse,
  OrderGrowthDataPoint,
  RevenueChartResponse,
  RevenueDataPoint,
  SalesDistributionResponse,
  TimeRange,
  UserGrowthChartResponse,
  UserGrowthDataPoint,
} from "./analytics.dto";
import { Decimal } from "@prisma/client/runtime/index-browser";

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get complete analytics data matching the UI structure exactly
   */
  async getCompleteAnalytics(
    query: AnalyticsQueryDto,
  ): Promise<CompleteAnalyticsResponse> {
    const timeRange = query.timeRange ?? TimeRange.MONTHLY;
    const { startDate, endDate, previousStartDate, previousEndDate, periods } =
      this.getDateRange(timeRange);

    const whereClause = query.vendorId ? { vendorId: query.vendorId } : {};

    // Fetch all required data in parallel
    const [orders, buyers, vendors, orderItems] = await Promise.all([
      // Orders for revenue and order growth
      this.prisma.order.findMany({
        where: {
          ...whereClause,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: {
          createdAt: true,
          totalAmount: true,
          subtotal: true,
        },
      }),
      // Buyers for user growth
      this.prisma.buyer.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { createdAt: true },
      }),
      // Vendors for user growth
      this.prisma.vendor.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { createdAt: true },
      }),
      // Order items for sales distribution
      this.prisma.orderItem.findMany({
        where: {
          order: {
            ...whereClause,
            createdAt: { gte: startDate, lte: endDate },
          },
        },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      }),
    ]);

    // Get previous period data for growth calculations
    const [
      previousOrders,
      previousBuyers,
      previousVendors,
      previousOrderItems,
    ] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          ...whereClause,
          createdAt: { gte: previousStartDate, lte: previousEndDate },
        },
        select: { totalAmount: true },
      }),
      this.prisma.buyer.count({
        where: { createdAt: { gte: previousStartDate, lte: previousEndDate } },
      }),
      this.prisma.vendor.count({
        where: { createdAt: { gte: previousStartDate, lte: previousEndDate } },
      }),
      this.prisma.orderItem.findMany({
        where: {
          order: {
            ...whereClause,
            createdAt: { gte: previousStartDate, lte: previousEndDate },
          },
        },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      }),
    ]);

    // Process revenue data
    const revenue = this.processRevenueData(
      orders,
      previousOrders,
      periods,
      timeRange,
    );

    // Process user growth data
    const users = this.processUserGrowthData(
      buyers,
      vendors,
      previousBuyers,
      previousVendors,
      periods,
      timeRange,
    );

    // Process order growth data
    const orderGrowth = this.processOrderGrowthData(orders, periods, timeRange);

    // Process sales distribution
    const categories = this.processSalesDistribution(
      orderItems,
      previousOrderItems,
    );

    return {
      revenue,
      users,
      orders: orderGrowth,
      categories,
    };
  }

  /**
   * Process revenue data for RevenueChart component
   */
  private processRevenueData(
    orders: Array<{ createdAt: Date; totalAmount: Decimal; subtotal: Decimal }>,
    previousOrders: Array<{ totalAmount: Decimal }>,
    periods: string[],
    timeRange: TimeRange,
  ): RevenueChartResponse {
    const periodMap = new Map<string, { revenue: number; profit: number }>();

    // Group orders by period
    orders.forEach((order) => {
      const periodKey = this.getPeriodKey(order.createdAt, timeRange);
      const revenue = this.decimalToNumber(order.totalAmount);
      const profit = Math.round(revenue * 0.3); // Estimate profit as 30% of revenue

      if (periodMap.has(periodKey)) {
        const existing = periodMap.get(periodKey)!;
        existing.revenue += revenue;
        existing.profit += profit;
      } else {
        periodMap.set(periodKey, { revenue, profit });
      }
    });

    // Create data array matching periods
    const data: RevenueDataPoint[] = periods.map((period) => {
      const periodData = periodMap.get(period) || { revenue: 0, profit: 0 };
      return {
        name: period,
        revenue: Math.round(periodData.revenue),
        profit: Math.round(periodData.profit),
      };
    });

    // Calculate totals
    const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
    const previousRevenue = previousOrders.reduce(
      (sum, order) => sum + this.decimalToNumber(order.totalAmount),
      0,
    );

    const totalRevenueChange = this.calculatePercentageChange(
      totalRevenue,
      previousRevenue,
    );

    return {
      data,
      totalRevenue,
      totalRevenueChange,
    };
  }

  /**
   * Process user growth data for UserGrowthChart component
   */
  private processUserGrowthData(
    buyers: Array<{ createdAt: Date }>,
    vendors: Array<{ createdAt: Date }>,
    previousBuyerCount: number,
    previousVendorCount: number,
    periods: string[],
    timeRange: TimeRange,
  ): UserGrowthChartResponse {
    const buyerMap = new Map<string, number>();
    const vendorMap = new Map<string, number>();

    // Group buyers by period
    buyers.forEach((buyer) => {
      const periodKey = this.getPeriodKey(buyer.createdAt, timeRange);
      buyerMap.set(periodKey, (buyerMap.get(periodKey) || 0) + 1);
    });

    // Group vendors by period
    vendors.forEach((vendor) => {
      const periodKey = this.getPeriodKey(vendor.createdAt, timeRange);
      vendorMap.set(periodKey, (vendorMap.get(periodKey) || 0) + 1);
    });

    // Create data array matching periods
    const data: UserGrowthDataPoint[] = periods.map((period) => ({
      name: period,
      buyers: buyerMap.get(period) || 0,
      vendors: vendorMap.get(period) || 0,
    }));

    // Calculate totals
    const totalUsers = buyers.length + vendors.length;
    const previousTotalUsers = previousBuyerCount + previousVendorCount;
    const totalUsersChange = this.calculatePercentageChange(
      totalUsers,
      previousTotalUsers,
    );

    return {
      data,
      totalUsers,
      totalUsersChange,
    };
  }

  /**
   * Process order growth data for OrderGrowthChart component
   */
  private processOrderGrowthData(
    orders: Array<{ createdAt: Date }>,
    periods: string[],
    timeRange: TimeRange,
  ): OrderGrowthChartResponse {
    const orderMap = new Map<string, number>();

    // Group orders by period
    orders.forEach((order) => {
      const periodKey = this.getPeriodKey(order.createdAt, timeRange);
      orderMap.set(periodKey, (orderMap.get(periodKey) || 0) + 1);
    });

    // Create data array matching periods
    const data: OrderGrowthDataPoint[] = periods.map((period) => ({
      name: period,
      orders: orderMap.get(period) || 0,
    }));

    return { data };
  }

  /**
   * Process sales distribution for SalesDistribution component
   */
  private processSalesDistribution(
    orderItems: Array<{
      totalPrice: Decimal;
      product: { category: { name: string } };
    }>,
    previousOrderItems: Array<{
      totalPrice: Decimal;
      product: { category: { name: string } };
    }>,
  ): SalesDistributionResponse {
    const categoryMap = new Map<string, number>();
    const previousCategoryMap = new Map<string, number>();

    // Group current period sales by category
    orderItems.forEach((item) => {
      const categoryName = item.product.category.name;
      const totalPrice = this.decimalToNumber(item.totalPrice);
      categoryMap.set(
        categoryName,
        (categoryMap.get(categoryName) || 0) + totalPrice,
      );
    });

    // Group previous period sales by category
    previousOrderItems.forEach((item) => {
      const categoryName = item.product.category.name;
      const totalPrice = this.decimalToNumber(item.totalPrice);
      previousCategoryMap.set(
        categoryName,
        (previousCategoryMap.get(categoryName) || 0) + totalPrice,
      );
    });

    // Color palette matching UI
    const colors = [
      "#278687",
      "#3B82F6",
      "#10B981",
      "#F59E0B",
      "#8B5CF6",
      "#EC4899",
    ];

    // Convert to array and add metadata
    const data: CategoryData[] = Array.from(categoryMap.entries())
      .map(([name, value], index) => {
        const previousValue = previousCategoryMap.get(name) || 0;
        const growth = this.calculatePercentageChange(value, previousValue);

        return {
          name,
          value: Math.round(value),
          color: colors[index % colors.length],
          growth: `${growth > 0 ? "+" : ""}${growth}%`,
          description: this.getCategoryDescription(name),
        };
      })
      .sort((a, b) => b.value - a.value); // Sort by value descending

    return { data };
  }

  /**
   * Get date range based on time range selection
   */
  private getDateRange(timeRange: TimeRange): {
    startDate: Date;
    endDate: Date;
    previousStartDate: Date;
    previousEndDate: Date;
    periods: string[];
  } {
    const now = new Date();
    const endDate = new Date(now);
    let startDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;
    let periods: string[] = [];

    switch (timeRange) {
      case TimeRange.DAILY:
        // Last 24 hours divided into 12 2-hour periods
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        previousStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
        previousEndDate = new Date(startDate);
        periods = Array.from({ length: 12 }, (_, i) => this.formatHour(i * 2));
        break;

      case TimeRange.WEEKLY:
        // Last 7 days
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(
          startDate.getTime() - 7 * 24 * 60 * 60 * 1000,
        );
        previousEndDate = new Date(startDate);
        periods = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        break;

      case TimeRange.YEARLY:
        // Last 5 years
        startDate = new Date(now.getFullYear() - 4, 0, 1);
        previousStartDate = new Date(startDate.getFullYear() - 5, 0, 1);
        previousEndDate = new Date(startDate);
        periods = Array.from({ length: 5 }, (_, i) =>
          (now.getFullYear() - 4 + i).toString(),
        );
        break;

      case TimeRange.MONTHLY:
      default:
        // Last 12 months
        startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        previousStartDate = new Date(
          startDate.getFullYear() - 1,
          startDate.getMonth(),
          1,
        );
        previousEndDate = new Date(startDate);
        periods = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        break;
    }

    return { startDate, endDate, previousStartDate, previousEndDate, periods };
  }

  /**
   * Get period key based on date and time range
   */
  private getPeriodKey(date: Date, timeRange: TimeRange): string {
    switch (timeRange) {
      case TimeRange.DAILY:
        const hour = date.getHours();
        const periodHour = Math.floor(hour / 2) * 2;
        return this.formatHour(periodHour);

      case TimeRange.WEEKLY:
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return days[date.getDay()];

      case TimeRange.MONTHLY:
        const months = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        return months[date.getMonth()];

      case TimeRange.YEARLY:
        return date.getFullYear().toString();

      default:
        return date.toISOString();
    }
  }

  /**
   * Format hour for daily view
   */
  private formatHour(hour: number): string {
    if (hour === 0) return "12am";
    if (hour < 12) return `${hour}am`;
    if (hour === 12) return "12pm";
    return `${hour - 12}pm`;
  }

  /**
   * Calculate percentage change
   */
  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  /**
   * Convert Prisma Decimal to number
   */
  private decimalToNumber(decimal: Decimal | null | undefined): number {
    if (!decimal) return 0;
    return parseFloat(decimal.toString());
  }

  /**
   * Get category description
   */
  private getCategoryDescription(categoryName: string): string {
    const descriptions: Record<string, string> = {
      Electronics: "Phones, Laptops & Accessories",
      Fashion: "Clothing, Shoes & Jewelry",
      "Home & Garden": "Furniture & Decor",
      Sports: "Equipment & Apparel",
      Books: "Physical & Digital Books",
      Toys: "Games & Educational",
      Beauty: "Cosmetics & Personal Care",
      Food: "Groceries & Beverages",
    };

    return descriptions[categoryName] || "Various Products";
  }
}
