import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateNotificationDto,
  NotificationCategory,
} from "./dto/create-notification.dto";
import {
  BroadcastNotificationDto,
  BroadcastTarget,
} from "./dto/broadcast-notification.dto";
import { UserType } from "../auth/dto/register.dto";

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(createNotificationDto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        ...createNotificationDto,
        category:
          createNotificationDto.category ?? NotificationCategory.SYSTEM,
      },
    });
  }

  async createBroadcast(dto: BroadcastNotificationDto) {
    const target = dto.target ?? BroadcastTarget.ALL;
    const userWhere =
      target === BroadcastTarget.BUYERS
        ? { userType: UserType.BUYER }
        : target === BroadcastTarget.VENDORS
          ? { userType: UserType.VENDOR }
          : {};

    const users = await this.prisma.user.findMany({
      where: userWhere,
      select: { id: true },
    });

    if (users.length === 0) {
      return { count: 0 };
    }

    const category =
      target === BroadcastTarget.BUYERS
        ? NotificationCategory.BUYER
        : target === BroadcastTarget.VENDORS
          ? NotificationCategory.VENDOR
          : NotificationCategory.BROADCAST;

    const broadcastId = dto.idempotencyKey ?? randomUUID();

    const result = await this.prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        title: dto.title,
        message: dto.message,
        type: dto.type ?? "info",
        category,
        broadcastId,
      })),
      skipDuplicates: true,
    });

    return { count: result.count };
  }

  async findAll() {
    return this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findUnread() {
    return this.prisma.notification.findMany({
      where: {
        isRead: false,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listBroadcasts() {
    return this.prisma.$queryRaw<
      Array<{
        broadcastId: string;
        title: string;
        message: string;
        type: string;
        category: string;
        createdAt: Date;
        recipients: number;
        readCount: number;
      }>
    >`
      SELECT
        "broadcastId",
        MIN("title") as "title",
        MIN("message") as "message",
        MIN("type") as "type",
        MIN("category") as "category",
        MIN("createdAt") as "createdAt",
        COUNT(*)::int as "recipients",
        SUM(CASE WHEN "isRead" THEN 1 ELSE 0 END)::int as "readCount"
      FROM "Notification"
      WHERE "broadcastId" IS NOT NULL
      GROUP BY "broadcastId"
      ORDER BY MIN("createdAt") DESC
    `;
  }

  async listBroadcastRecipients(broadcastId: string) {
    return this.prisma.notification.findMany({
      where: { broadcastId },
      orderBy: { createdAt: "desc" },
    });
  }

  async markAsRead(id: string, userId?: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (userId && notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId?: string) {
    return this.prisma.notification.updateMany({
      where: {
        ...(userId ? { userId } : {}),
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  async delete(id: string, userId?: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (userId && notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.delete({
      where: { id },
    });
  }
}
