import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityType, ActorType } from "generated/prisma/enums";
// import { ActivityType, ActorType } from "@prisma/client";

interface LogActivityParams {
  type: ActivityType;
  title: string;
  description: string;
  entity?: string;
  entityId?: string;
  actorType?: ActorType;
  actorName?: string;
  meta?: Record<string, any>;
}

@Injectable()
export class ActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log an activity to the database
   */
  async logActivity(params: LogActivityParams) {
    return this.prisma.activityLog.create({
      data: {
        type: params.type,
        title: params.title,
        description: params.description,
        entity: params.entity,
        entityId: params.entityId,
        actorType: params.actorType,
        actorName: params.actorName,
        meta: params.meta || {},
      },
    });
  }

  /**
   * Log order created activity
   */
  async logOrderCreated(
    orderId: string,
    buyerName: string,
    orderNumber: string,
  ) {
    return this.logActivity({
      type: "ORDER_CREATED",
      title: `New order ${orderNumber} placed by ${buyerName}`,
      description: `Order created successfully`,
      entity: "Order",
      entityId: orderId,
      actorType: "USER",
      actorName: buyerName,
    });
  }

  /**
   * Log order delivered activity
   */
  async logOrderDelivered(
    orderId: string,
    orderNumber: string,
    destination: string,
  ) {
    return this.logActivity({
      type: "ORDER_DELIVERED",
      title: `Order ${orderNumber} delivered to ${destination}`,
      description: `Order successfully delivered`,
      entity: "Order",
      entityId: orderId,
      actorType: "SYSTEM",
    });
  }

  /**
   * Log vendor KYC submission
   */
  async logVendorKycSubmitted(vendorId: string, vendorName: string) {
    return this.logActivity({
      type: "VENDOR_KYC_SUBMITTED",
      title: `Vendor "${vendorName}" submitted KYC documents`,
      description: `KYC documents submitted for verification`,
      entity: "Vendor",
      entityId: vendorId,
      actorType: "VENDOR",
      actorName: vendorName,
    });
  }

  /**
   * Log user registration
   */
  async logUserRegistered(userId: string, userName: string) {
    return this.logActivity({
      type: "USER_REGISTERED",
      title: `New User "${userName}" registered`,
      description: `User account created successfully`,
      entity: "User",
      entityId: userId,
      actorType: "USER",
      actorName: userName,
    });
  }

  /**
   * Log payment received
   */
  async logPaymentReceived(
    paymentId: string,
    amount: number,
    vendorName: string,
  ) {
    return this.logActivity({
      type: "PAYMENT_RECEIVED",
      title: `Payment received from "${vendorName}"`,
      description: `Payment of $${amount.toFixed(2)} received`,
      entity: "Payment",
      entityId: paymentId,
      actorType: "VENDOR",
      actorName: vendorName,
      meta: { amount },
    });
  }

  /**
   * Log order creation failure
   */
  async logOrderCreateFailed(reason: string, buyerName?: string) {
    return this.logActivity({
      type: "ORDER_CREATE_FAILED",
      title: `Order creation failed`,
      description: reason,
      entity: "Order",
      actorType: "SYSTEM",
      actorName: buyerName,
      meta: { reason },
    });
  }
}
