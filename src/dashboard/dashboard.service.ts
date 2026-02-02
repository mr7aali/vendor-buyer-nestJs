import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
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
import { ActivityType } from "generated/prisma/enums";
import { DashboardQueryClsDto } from "./dto/dashboard-query.dto";
// import {
//   DashboardOverviewDto,
//   DashboardQueryDto,
//   KPIMetricsDto,
//   SystemHealthDto,
//   OrderFulfillmentDto,
//   SupportVolumeDto,
//   WeeklyRevenueDataDto,
//   WeeklyUserDataDto,
//   ActivityItemDto,
//   ActionItemDto,
// } from './dto/admin-dashboard.dto';
// import { ActivityType } from '@prisma/client';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get complete dashboard overview
   */
  async getDashboardOverview(query: DashboardQueryClsDto) {
    const [
      kpiMetrics,
      systemHealth,
      orderFulfillment,
      supportVolume,
      weeklyRevenue,
      weeklyUsers,
      recentActivity,
      actionItems,
    ] = await Promise.all([
      this.getKPIMetrics(query.days),
      this.getSystemHealth(),
      this.getOrderFulfillment(),
      this.getSupportVolume(),
      query.includeCharts ? this.getWeeklyRevenue(query.days) : [],
      query.includeCharts ? this.getWeeklyUsers(query.days) : [],
      query.includeActivity ? this.getRecentActivity(10) : [],
      this.getActionItems(),
    ]);

    return {
      kpiMetrics,
      systemHealth,
      orderFulfillment,
      supportVolume,
      weeklyRevenue,
      weeklyUsers,
      recentActivity,
      actionItems,
    };
  }

  /**
   * Get KPI metrics with comparison to previous period
   */
  async getKPIMetrics(days: number = 7): Promise<KPIMetricsDto> {
    const currentPeriodStart = new Date();
    currentPeriodStart.setDate(currentPeriodStart.getDate() - days);

    const previousPeriodStart = new Date(currentPeriodStart);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - days);

    // Total Users
    const [currentUsers, previousUsers] = await Promise.all([
      this.prisma.user.count({
        where: { createdAt: { gte: currentPeriodStart } },
      }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: previousPeriodStart,
            lt: currentPeriodStart,
          },
        },
      }),
    ]);

    const totalUsers = await this.prisma.user.count();
    const totalUsersChange = this.calculatePercentageChange(
      currentUsers,
      previousUsers,
    );

    // Total Revenue
    const [currentRevenue, previousRevenue] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          status: "succeeded",
          createdAt: { gte: currentPeriodStart },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          status: "succeeded",
          createdAt: {
            gte: previousPeriodStart,
            lt: currentPeriodStart,
          },
        },
        _sum: { amount: true },
      }),
    ]);

    const totalRevenue = Number(currentRevenue._sum.amount || 0);
    const totalRevenueChange = this.calculatePercentageChange(
      Number(currentRevenue._sum.amount || 0),
      Number(previousRevenue._sum.amount || 0),
    );

    // Pending Orders
    const [currentPending, previousPending] = await Promise.all([
      this.prisma.order.count({
        where: {
          status: "pending",
          createdAt: { gte: currentPeriodStart },
        },
      }),
      this.prisma.order.count({
        where: {
          status: "pending",
          createdAt: {
            gte: previousPeriodStart,
            lt: currentPeriodStart,
          },
        },
      }),
    ]);

    const pendingOrders = await this.prisma.order.count({
      where: { status: "pending" },
    });
    const pendingOrdersChange = this.calculatePercentageChange(
      currentPending,
      previousPending,
    );

    // Active Vendors
    const [currentVendors, previousVendors] = await Promise.all([
      this.prisma.vendor.count({
        where: {
          isActive: true,
          createdAt: { gte: currentPeriodStart },
        },
      }),
      this.prisma.vendor.count({
        where: {
          isActive: true,
          createdAt: {
            gte: previousPeriodStart,
            lt: currentPeriodStart,
          },
        },
      }),
    ]);

    const activeVendors = await this.prisma.vendor.count({
      where: { isActive: true },
    });
    const activeVendorsChange = this.calculatePercentageChange(
      currentVendors,
      previousVendors,
    );

    return {
      totalUsers,
      totalUsersChange,
      totalRevenue,
      totalRevenueChange,
      pendingOrders,
      pendingOrdersChange,
      activeVendors,
      activeVendorsChange,
    };
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealthDto> {
    // This is a simplified implementation
    // In production, you'd track actual system metrics, API response times, etc.
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    // Check for any failed operations in last 24h
    const failedOperations = await this.prisma.activityLog.count({
      where: {
        type: "ORDER_CREATE_FAILED",
        createdAt: { gte: last24Hours },
      },
    });

    const status = failedOperations > 10 ? "degraded" : "operational";
    const uptime = failedOperations > 10 ? 99.5 : 99.9;

    return {
      status,
      uptime,
      lastOutageHours: 0,
      message:
        status === "operational"
          ? "All systems operational. No reported outages in the last 24h."
          : "Some systems experiencing degraded performance.",
    };
  }

  /**
   * Get order fulfillment statistics
   */
  async getOrderFulfillment(): Promise<OrderFulfillmentDto> {
    const totalOrders = await this.prisma.order.count();

    const [delivered, inTransit, pending, failed] = await Promise.all([
      this.prisma.order.count({ where: { status: "delivered" } }),
      this.prisma.order.count({ where: { status: "in_transit" } }),
      this.prisma.order.count({ where: { status: "pending" } }),
      this.prisma.order.count({ where: { status: "failed" } }),
    ]);

    // Get previous week's delivered count for change calculation
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const previousDelivered = await this.prisma.order.count({
      where: {
        status: "delivered",
        updatedAt: { lt: lastWeek },
      },
    });

    const deliveredChange = this.calculatePercentageChange(
      delivered,
      previousDelivered,
    );

    return {
      delivered: {
        percentage: this.calculatePercentage(delivered, totalOrders),
        count: delivered,
        change: deliveredChange,
      },
      inTransit: {
        percentage: this.calculatePercentage(inTransit, totalOrders),
        count: inTransit,
        status: "Active",
      },
      pending: {
        percentage: this.calculatePercentage(pending, totalOrders),
        count: pending,
      },
      failed: {
        percentage: this.calculatePercentage(failed, totalOrders),
        count: failed,
      },
    };
  }

  /**
   * Get support volume statistics
   * Note: You'll need to implement a Ticket/Support model for real data
   */
  async getSupportVolume(): Promise<SupportVolumeDto> {
    // This is a placeholder implementation
    // You should create a Support/Ticket model and implement real tracking

    // For now, using notifications as a proxy for support tickets
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTickets = await this.prisma.notification.count({
      where: { createdAt: { gte: today } },
    });

    // Placeholder values - implement real support ticket system
    return {
      todayTickets,
      averageResponseMinutes: 24,
      critical: 8,
      high: 15,
      medium: 45,
      low: 60,
    };
  }

  /**
   * Get weekly revenue data
   */
  async getWeeklyRevenue(days: number = 7): Promise<WeeklyRevenueDataDto[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { not: "failed" },
      },
      select: {
        totalAmount: true,
        discountAmount: true,
        createdAt: true,
      },
    });

    // Group by day
    const dayMap = new Map<string, { revenue: number; profit: number }>();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    orders.forEach((order) => {
      const dayName = dayNames[order.createdAt.getDay()];
      const revenue = Number(order.totalAmount);
      const profit = revenue * 0.7; // Assuming 70% profit margin

      if (!dayMap.has(dayName)) {
        dayMap.set(dayName, { revenue: 0, profit: 0 });
      }

      const current = dayMap.get(dayName)!;
      dayMap.set(dayName, {
        revenue: current.revenue + revenue,
        profit: current.profit + profit,
      });
    });

    // Convert to array and sort by week day
    const result: WeeklyRevenueDataDto[] = [];
    const todayIndex = new Date().getDay();

    for (let i = 0; i < 7; i++) {
      const dayIndex = (todayIndex - 6 + i + 7) % 7;
      const dayName = dayNames[dayIndex];
      const data = dayMap.get(dayName) || { revenue: 0, profit: 0 };

      result.push({
        name: dayName,
        revenue: Math.round(data.revenue),
        profit: Math.round(data.profit),
      });
    }

    return result;
  }

  /**
   * Get weekly user growth data
   */
  async getWeeklyUsers(days: number = 7): Promise<WeeklyUserDataDto[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [buyers, vendors] = await Promise.all([
      this.prisma.buyer.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true },
      }),
      this.prisma.vendor.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true },
      }),
    ]);

    // Group by day
    const dayMap = new Map<string, { buyers: number; vendors: number }>();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    buyers.forEach((buyer) => {
      const dayName = dayNames[buyer.createdAt.getDay()];
      if (!dayMap.has(dayName)) {
        dayMap.set(dayName, { buyers: 0, vendors: 0 });
      }
      dayMap.get(dayName)!.buyers++;
    });

    vendors.forEach((vendor) => {
      const dayName = dayNames[vendor.createdAt.getDay()];
      if (!dayMap.has(dayName)) {
        dayMap.set(dayName, { buyers: 0, vendors: 0 });
      }
      dayMap.get(dayName)!.vendors++;
    });

    // Convert to array and sort by week day
    const result: WeeklyUserDataDto[] = [];
    const todayIndex = new Date().getDay();

    for (let i = 0; i < 7; i++) {
      const dayIndex = (todayIndex - 6 + i + 7) % 7;
      const dayName = dayNames[dayIndex];
      const data = dayMap.get(dayName) || { buyers: 0, vendors: 0 };

      result.push({
        name: dayName,
        buyers: data.buyers,
        vendors: data.vendors,
      });
    }

    return result;
  }

  /**
   * Get recent activity feed
   */
  async getRecentActivity(limit: number = 10): Promise<ActivityItemDto[]> {
    const activities = await this.prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return activities.map((activity) => ({
      id: activity.id,
      type: this.mapActivityType(activity.type),
      text: activity.title,
      time: this.getRelativeTime(activity.createdAt),
      timestamp: activity.createdAt,
      icon: this.getActivityIcon(activity.type),
      color: this.getActivityColor(activity.type),
    }));
  }

  /**
   * Get action items that need attention
   */
  async getActionItems(): Promise<ActionItemDto[]> {
    const [pendingVerifications, unshippedOrders, unreadMessages] =
      await Promise.all([
        // Pending KYC verifications
        this.prisma.vendor.count({
          where: {
            OR: [{ isNidVerify: false }, { isBussinessIdVerified: false }],
          },
        }),

        // Orders pending for more than 24 hours
        this.prisma.order.count({
          where: {
            status: "pending",
            createdAt: {
              lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),

        // Unread high-priority messages/notifications
        this.prisma.notification.count({
          where: { isRead: false },
        }),
      ]);

    const actionItems: ActionItemDto[] = [];

    if (pendingVerifications > 0) {
      actionItems.push({
        type: "VERIFICATION",
        count: pendingVerifications,
        title: `${pendingVerifications} Pending Verifications`,
        description: "Vendor KYC Requests",
        severity: "critical",
        actionUrl: "/admin/verification",
      });
    }

    if (unshippedOrders > 0) {
      actionItems.push({
        type: "UNSHIPPED_ORDERS",
        count: unshippedOrders,
        title: `${unshippedOrders} Unshipped Orders`,
        description: "Exceeding 24h limit",
        severity: "warning",
        actionUrl: "/admin/orders",
      });
    }

    if (unreadMessages > 0) {
      actionItems.push({
        type: "SUPPORT_MESSAGES",
        count: unreadMessages,
        title: `${unreadMessages} New Support Messages`,
        description: "High Priority",
        severity: "info",
        actionUrl: "/admin/chats",
      });
    }

    return actionItems;
  }

  // ============================================
  // Helper Methods
  // ============================================

  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  private calculatePercentage(part: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((part / total) * 100);
  }

  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  }

  private mapActivityType(
    type: ActivityType,
  ): "ORDER" | "VENDOR_KYC" | "DELIVERY" | "USER_REGISTRATION" | "PAYMENT" {
    const mapping = {
      ORDER_CREATED: "ORDER",
      ORDER_DELIVERED: "DELIVERY",
      ORDER_CREATE_FAILED: "ORDER",
      VENDOR_KYC_SUBMITTED: "VENDOR_KYC",
      USER_REGISTERED: "USER_REGISTRATION",
      PAYMENT_RECEIVED: "PAYMENT",
    };
    return mapping[type] as any;
  }

  private getActivityIcon(type: ActivityType): string {
    const icons = {
      ORDER_CREATED: "ShoppingBag",
      ORDER_DELIVERED: "Truck",
      ORDER_CREATE_FAILED: "AlertCircle",
      VENDOR_KYC_SUBMITTED: "AlertCircle",
      USER_REGISTERED: "Users",
      PAYMENT_RECEIVED: "DollarSign",
    };
    return icons[type];
  }

  private getActivityColor(type: ActivityType): string {
    const colors = {
      ORDER_CREATED: "text-blue-500 bg-blue-50",
      ORDER_DELIVERED: "text-green-500 bg-green-50",
      ORDER_CREATE_FAILED: "text-red-500 bg-red-50",
      VENDOR_KYC_SUBMITTED: "text-amber-500 bg-amber-50",
      USER_REGISTERED: "text-purple-500 bg-purple-50",
      PAYMENT_RECEIVED: "text-green-500 bg-green-50",
    };
    return colors[type];
  }
}
