import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateMessageDto } from "./dto/create-message.dto";

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async create(senderId: string, createMessageDto: CreateMessageDto) {
    // Get sender and receiver
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      include: {
        vendor: true,
        buyer: true,
      },
    });

    const receiver = await this.prisma.user.findUnique({
      where: { id: createMessageDto.receiverId },
      include: {
        vendor: true,
        buyer: true,
      },
    });

    if (!sender || !receiver) {
      throw new NotFoundException("User not found");
    }

    // Verify that sender and receiver are vendor-buyer pairs
    if (sender.userType === receiver.userType) {
      throw new BadRequestException(
        "Messages can only be sent between vendors and buyers",
      );
    }

    let vendorId: string | null = null;
    let buyerId: string | null = null;

    if (sender.userType === "vendor") {
      vendorId = sender.vendor?.id || null;
      buyerId = receiver.buyer?.id || null;
    } else {
      vendorId = receiver.vendor?.id || null;
      buyerId = sender.buyer?.id || null;
    }

    if (!vendorId || !buyerId) {
      throw new BadRequestException("Invalid vendor-buyer relationship");
    }

    // Verify connection
    const connection = await this.prisma.vendorBuyerConnection.findUnique({
      where: {
        vendorId_buyerId: {
          vendorId,
          buyerId,
        },
      },
    });

    if (!connection || !connection.isActive) {
      throw new ForbiddenException("You are not connected to this user");
    }

    return this.prisma.message.create({
      data: {
        senderId,
        receiverId: createMessageDto.receiverId,
        vendorId,
        buyerId,
        messageText: createMessageDto.messageText,
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            fullName: true,
            userType: true,
          },
        },
        receiver: {
          select: {
            id: true,
            email: true,
            fullName: true,
            userType: true,
          },
        },
      },
    });
  }

  async getConversations(userId: string) {
    // Get all messages where user is sender or receiver
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            fullName: true,
            userType: true,
          },
        },
        receiver: {
          select: {
            id: true,
            email: true,
            fullName: true,
            userType: true,
          },
        },
      },
      orderBy: { sentAt: "desc" },
    });

    // Group by conversation partner
    const conversations = new Map<string, any>();

    for (const message of messages) {
      const partnerId =
        message.senderId === userId ? message.receiverId : message.senderId;
      const partner =
        message.senderId === userId ? message.receiver : message.sender;

      if (!conversations.has(partnerId)) {
        conversations.set(partnerId, {
          partnerId,
          partner,
          lastMessage: message,
          unreadCount: 0,
        });
      }

      const conversation = conversations.get(partnerId);
      if (message.receiverId === userId && !message.isRead) {
        conversation.unreadCount++;
      }
    }

    return Array.from(conversations.values());
  }

  async getMessages(userId: string, partnerId: string) {
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: userId },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            fullName: true,
            userType: true,
          },
        },
        receiver: {
          select: {
            id: true,
            email: true,
            fullName: true,
            userType: true,
          },
        },
      },
      orderBy: { sentAt: "asc" },
    });

    // Mark messages as read
    await this.prisma.message.updateMany({
      where: {
        senderId: partnerId,
        receiverId: userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return messages;
  }

  async markAsRead(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException("Message not found");
    }

    if (message.receiverId !== userId) {
      throw new ForbiddenException("You cannot mark this message as read");
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: { isRead: true },
    });
  }
}
