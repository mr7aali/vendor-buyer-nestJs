// ============================================
// Admin Dashboard DTOs
// ============================================

export class KPIMetricsDto {
  totalUsers: number;
  totalUsersChange: number; // percentage
  totalRevenue: number;
  totalRevenueChange: number; // percentage
  pendingOrders: number;
  pendingOrdersChange: number; // percentage
  activeVendors: number;
  activeVendorsChange: number; // percentage
}

export class SystemHealthDto {
  status: "operational" | "degraded" | "down";
  uptime: number; // percentage
  lastOutageHours: number;
  message: string;
}

export class OrderFulfillmentDto {
  delivered: {
    percentage: number;
    count: number;
    change: number; // percentage change
  };
  inTransit: {
    percentage: number;
    count: number;
    status: string;
  };
  pending: {
    percentage: number;
    count: number;
  };
  failed: {
    percentage: number;
    count: number;
  };
}

export class SupportVolumeDto {
  todayTickets: number;
  averageResponseMinutes: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export class WeeklyRevenueDataDto {
  name: string; // Day name
  revenue: number;
  profit: number;
}

export class WeeklyUserDataDto {
  name: string; // Day name
  buyers: number;
  vendors: number;
}

export class ActivityItemDto {
  id: string;
  type: "ORDER" | "VENDOR_KYC" | "DELIVERY" | "USER_REGISTRATION" | "PAYMENT";
  text: string;
  time: string; // e.g., "2 mins ago"
  timestamp: Date;
  icon: string;
  color: string;
}

export class ActionItemDto {
  type: "VERIFICATION" | "UNSHIPPED_ORDERS" | "SUPPORT_MESSAGES";
  count: number;
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
  actionUrl: string;
}

export class DashboardOverviewDto {
  kpiMetrics: KPIMetricsDto;
  systemHealth: SystemHealthDto;
  orderFulfillment: OrderFulfillmentDto;
  supportVolume: SupportVolumeDto;
  weeklyRevenue: WeeklyRevenueDataDto[];
  weeklyUsers: WeeklyUserDataDto[];
  recentActivity: ActivityItemDto[];
  actionItems: ActionItemDto[];
}

// Query DTOs
export class DashboardQueryDto {
  days?: number = 7; // Default to last 7 days
  includeCharts?: boolean = true;
  includeActivity?: boolean = true;
}

// Query DTOs
// export class DashboardQueryDto {
//   days?: number; // Default to last 7 days
//   includeCharts?: boolean;
//   includeActivity?: boolean;
// }
