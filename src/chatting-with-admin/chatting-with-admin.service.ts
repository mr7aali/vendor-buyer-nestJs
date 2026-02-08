import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AdminChatSenderType } from "generated/prisma/enums";
import { UserType } from "src/auth/dto/register.dto";

type UserChatContext = {
  senderType: UserType.BUYER | UserType.VENDOR;
  buyerId?: string;
  vendorId?: string;
};

@Injectable()
export class ChattingWithAdminService {
  constructor(private prisma: PrismaService) {}

  async getAdminConversations() {
    const threads = await this.prisma.adminChatThread.findMany({
      include: {
        buyer: {
          include: {
            user: {
              select: { id: true, email: true },
            },
          },
        },
        vendor: {
          include: {
            user: {
              select: { id: true, email: true },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const unreadCounts = await this.prisma.adminChatMessage.groupBy({
      by: ["threadId"],
      where: {
        senderType: { not: AdminChatSenderType.ADMIN },
        isRead: false,
      },
      _count: { _all: true },
    });

    const unreadMap = new Map(
      unreadCounts.map((item) => [item.threadId, item._count._all]),
    );

    return threads.map((thread) => {
      const participantType = thread.buyerId ? "buyer" : "vendor";
      const participant = thread.buyer
        ? {
            id: thread.buyer.id,
            userId: thread.buyer.userId,
            name: thread.buyer.fullName,
            avatar: thread.buyer.profilePhotoUrl,
            role: "Buyer",
            email: thread.buyer.user?.email || "",
          }
        : {
            id: thread.vendor?.id || "",
            userId: thread.vendor?.userId || "",
            name:
              thread.vendor?.storename || thread.vendor?.fullName || "Vendor",
            avatar: thread.vendor?.logoUrl || "",
            role: "Vendor",
            email: thread.vendor?.user?.email || "",
          };

      const lastMessage = thread.messages[0] || null;

      return {
        threadId: thread.id,
        participantType,
        participant,
        lastMessage,
        unreadCount: unreadMap.get(thread.id) || 0,
        updatedAt: thread.updatedAt,
      };
    });
  }

  async getAdminMessages(threadId: string) {
    const thread = await this.prisma.adminChatThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException("Chat thread not found");
    }

    const messages = await this.prisma.adminChatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
    });

    await this.prisma.adminChatMessage.updateMany({
      where: {
        threadId,
        senderType: { not: AdminChatSenderType.ADMIN },
        isRead: false,
      },
      data: { isRead: true },
    });

    return messages;
  }

  async sendAdminMessage(
    adminId: number,
    threadId: string,
    messageText: string,
  ) {
    const thread = await this.prisma.adminChatThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException("Chat thread not found");
    }

    if (!thread.assignedAdminId) {
      await this.prisma.adminChatThread.update({
        where: { id: threadId },
        data: { assignedAdminId: adminId },
      });
    }

    return this.prisma.adminChatMessage.create({
      data: {
        threadId,
        senderType: AdminChatSenderType.ADMIN,
        senderAdminId: adminId,
        messageText,
      },
    });
  }

  async createThreadForAdmin(payload: { buyerId?: string; vendorId?: string }) {
    if (!payload.buyerId && !payload.vendorId) {
      throw new BadRequestException("buyerId or vendorId is required");
    }

    if (payload.buyerId && payload.vendorId) {
      throw new BadRequestException("Provide only buyerId or vendorId");
    }

    const existing = await this.prisma.adminChatThread.findFirst({
      where: {
        buyerId: payload.buyerId || undefined,
        vendorId: payload.vendorId || undefined,
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.adminChatThread.create({
      data: {
        buyerId: payload.buyerId || null,
        vendorId: payload.vendorId || null,
      },
    });
  }

  async getOrCreateUserThread(userId: string) {
    const context = await this.resolveUserContext(userId);

    const existing = await this.prisma.adminChatThread.findFirst({
      where: {
        buyerId: context.buyerId || undefined,
        vendorId: context.vendorId || undefined,
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.adminChatThread.create({
      data: {
        buyerId: context.buyerId || null,
        vendorId: context.vendorId || null,
      },
    });
  }

  async getUserMessages(userId: string) {
    const thread = await this.getOrCreateUserThread(userId);

    const messages = await this.prisma.adminChatMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: "asc" },
    });

    await this.prisma.adminChatMessage.updateMany({
      where: {
        threadId: thread.id,
        senderType: AdminChatSenderType.ADMIN,
        isRead: false,
      },
      data: { isRead: true },
    });

    return messages;
  }

  async sendUserMessage(userId: string, messageText: string) {
    const thread = await this.getOrCreateUserThread(userId);
    const context = await this.resolveUserContext(userId);

    return this.prisma.adminChatMessage.create({
      data: {
        threadId: thread.id,
        senderType: context.senderType,
        senderBuyerId: context.buyerId || null,
        senderVendorId: context.vendorId || null,
        messageText,
      },
    });
  }

  async getAllThreadIds() {
    const threads = await this.prisma.adminChatThread.findMany({
      select: { id: true },
    });
    return threads.map((thread) => thread.id);
  }

  private async resolveUserContext(userId: string): Promise<UserChatContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        buyer: true,
        vendor: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const userType = user.userType?.toLowerCase();

    if (userType === "buyer") {
      if (!user.buyer) {
        throw new BadRequestException("Buyer profile not found");
      }
      return {
        senderType: UserType.BUYER,
        buyerId: user.buyer.id,
      };
    }

    if (userType === "vendor") {
      if (!user.vendor) {
        throw new BadRequestException("Vendor profile not found");
      }
      return {
        senderType: UserType.VENDOR,
        vendorId: user.vendor.id,
      };
    }

    throw new BadRequestException(
      "Only buyers and vendors can chat with admins",
    );
  }
}
