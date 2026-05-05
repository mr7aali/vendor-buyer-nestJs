import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateMessageDto } from "./dto/create-message.dto";
import { Prisma } from "../../generated/prisma/client";
import { CloudinaryService } from "src/cloudinary/cloudinary.service";

type AutoMessageType = "ORDER_PLACED" | "ORDER_UPDATED";

interface CreateAutoMessageInput {
  senderId: string;
  receiverId: string;
  messageText: string;
  type: AutoMessageType;
  orderId: string;
  metadata: Prisma.InputJsonValue;
}

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(senderId: string, createMessageDto: CreateMessageDto) {
    try {
      return await this.createMessage({
        senderId,
        receiverId: createMessageDto.receiverId,
        messageText: createMessageDto.messageText,
        type: "TEXT",
      });
    } catch (error) {
      this.handleError("create message", error);
    }
  }

  async createAutoMessage(input: CreateAutoMessageInput) {
    try {
      return await this.createMessage({
        senderId: input.senderId,
        receiverId: input.receiverId,
        messageText: input.messageText,
        type: input.type,
        orderId: input.orderId,
        metadata: input.metadata,
      });
    } catch (error) {
      this.handleError("create auto message", error);
    }
  }

  async uploadChatImage(file: Express.Multer.File) {
    try {
      const upload = await this.cloudinaryService.uploadFile(file, "chat-images");
      return {
        url: upload.secure_url,
        publicId: upload.public_id,
      };
    } catch (error) {
      this.handleError("upload chat image", error);
    }
  }

  async getConversations(userId: string) {
    try {
      const messages = await this.prisma.message.findMany({
        where: {
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
        include: this.getMessageInclude(),
        orderBy: { createdAt: "desc" },
      });

      const conversations = new Map<
        string,
        {
          conversationId: string | null;
          partnerId: string;
          partner: any;
          lastMessage: any;
          unreadCount: number;
        }
      >();

      for (const message of messages) {
        const partnerId =
          message.senderId === userId ? message.receiverId : message.senderId;
        const partnerUser =
          message.senderId === userId ? message.receiver : message.sender;
        const conversationKey =
          message.vendorId && message.buyerId
            ? `${message.vendorId}:${message.buyerId}`
            : [userId, partnerId].sort().join(":");

        if (!conversations.has(conversationKey)) {
          let conversationId = message.conversationId;

          if (!conversationId && message.vendorId && message.buyerId) {
            const conversation = await this.getOrCreateConversation(
              message.vendorId,
              message.buyerId,
            );
            conversationId = conversation.id;
          }

          conversations.set(conversationKey, {
            conversationId,
            partnerId,
            partner: this.buildConversationPartner(partnerUser),
            lastMessage: message,
            unreadCount: 0,
          });
        }

        if (message.receiverId === userId && !message.isRead) {
          const current = conversations.get(conversationKey);
          if (current) {
            current.unreadCount += 1;
          }
        }
      }

      const uniqueConversationIds = Array.from(conversations.values())
        .map((conversation) => conversation.conversationId)
        .filter((id): id is string => Boolean(id));

      const pinnedMap = new Map<string, any>();
      if (uniqueConversationIds.length > 0) {
        const pinnedConversations = await this.prisma.conversation.findMany({
          where: {
            id: {
              in: uniqueConversationIds,
            },
          },
          include: {
            pinnedMessage: {
              include: this.getMessageInclude(),
            },
          },
        });

        for (const conversation of pinnedConversations) {
          pinnedMap.set(conversation.id, conversation.pinnedMessage);
        }
      }

      return Array.from(conversations.values()).map((conversation) => ({
        ...conversation,
        pinnedMessage: conversation.conversationId
          ? pinnedMap.get(conversation.conversationId) ?? null
          : null,
      }));
    } catch (error) {
      this.handleError("get conversations", error);
    }
  }

  async getMessages(userId: string, partnerId: string) {
    try {
      const messages = await this.prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId: partnerId },
            { senderId: partnerId, receiverId: userId },
          ],
        },
        include: this.getMessageInclude(),
        orderBy: { createdAt: "asc" },
      });

      await this.prisma.message.updateMany({
        where: {
          senderId: partnerId,
          receiverId: userId,
          isRead: false,
        },
        data: { isRead: true },
      });

      return messages;
    } catch (error) {
      this.handleError("get messages", error);
    }
  }

  async markAsRead(messageId: string, userId: string) {
    try {
      const message = await this.prisma.message.findUnique({
        where: { id: messageId },
      });

      if (!message) {
        throw new NotFoundException("Message not found");
      }

      if (message.receiverId !== userId) {
        throw new ForbiddenException("You cannot mark this message as read");
      }

      return await this.prisma.message.update({
        where: { id: messageId },
        data: { isRead: true },
      });
    } catch (error) {
      this.handleError("mark message as read", error);
    }
  }

  async pinMessage(messageId: string, conversationId: string) {
    try {
      const message = await this.prisma.message.findUnique({
        where: { id: messageId },
        select: {
          id: true,
          conversationId: true,
          type: true,
          orderId: true,
        },
      });

      if (!message) {
        throw new NotFoundException("Message not found");
      }

      if (message.conversationId !== conversationId) {
        throw new BadRequestException(
          "Message does not belong to the conversation",
        );
      }

      if (message.type !== "ORDER_PLACED" && message.type !== "ORDER_UPDATED") {
        throw new BadRequestException("Only order messages can be pinned");
      }

      if (message.orderId) {
        const order = await this.prisma.order.findUnique({
          where: { id: message.orderId },
          select: { status: true },
        });

        if (
          order &&
          (order.status === "delivered" || order.status === "cancelled")
        ) {
          throw new BadRequestException(
            "Completed or cancelled order messages cannot be pinned",
          );
        }
      }

      const existingConversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { id: true },
      });

      if (!existingConversation) {
        throw new NotFoundException("Conversation not found");
      }

      return await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          pinnedMessageId: messageId,
          updatedAt: new Date(),
        },
        include: this.getConversationWithPinnedMessageInclude(),
      });
    } catch (error) {
      this.handleError("pin message", error);
    }
  }

  async getPinnedMessage(userId: string, conversationId: string) {
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: this.getConversationWithPinnedMessageInclude(),
      });

      if (!conversation) {
        throw new NotFoundException("Conversation not found");
      }

      this.validateConversationAccess(userId, conversation);
      return conversation.pinnedMessage;
    } catch (error) {
      this.handleError("get pinned message", error);
    }
  }

  async getConversationParticipants(conversationId: string) {
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: this.getConversationWithPinnedMessageInclude(),
      });

      if (!conversation) {
        throw new NotFoundException("Conversation not found");
      }

      return conversation;
    } catch (error) {
      this.handleError("get conversation participants", error);
    }
  }

  async unpinMessageByOrderId(orderId: string) {
    try {
      const conversation = await this.prisma.conversation.findFirst({
        where: {
          pinnedMessage: {
            orderId,
          },
        },
        include: this.getConversationWithPinnedMessageInclude(),
      });

      if (!conversation) {
        return null;
      }

      return await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          pinnedMessageId: null,
          updatedAt: new Date(),
        },
        include: this.getConversationWithPinnedMessageInclude(),
      });
    } catch (error) {
      this.handleError("unpin order message", error);
    }
  }

  private async createMessage(input: {
    senderId: string;
    receiverId: string;
    messageText: string;
    type: string;
    orderId?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    const { vendorId, buyerId } = await this.resolveParticipants(
      input.senderId,
      input.receiverId,
    );

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

    const conversation = await this.getOrCreateConversation(vendorId, buyerId);

    const message = await this.prisma.message.create({
      data: {
        senderId: input.senderId,
        receiverId: input.receiverId,
        vendorId,
        buyerId,
        conversationId: conversation.id,
        messageText: input.messageText,
        type: input.type,
        orderId: input.orderId ?? null,
        metadata: input.metadata,
      },
      include: this.getMessageInclude(),
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        updatedAt: new Date(),
      },
    });

    return message;
  }

  private async resolveParticipants(senderId: string, receiverId: string) {
    const [sender, receiver] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: senderId },
        include: {
          vendor: true,
          buyer: true,
        },
      }),
      this.prisma.user.findUnique({
        where: { id: receiverId },
        include: {
          vendor: true,
          buyer: true,
        },
      }),
    ]);

    if (!sender) {
      throw new NotFoundException("Sender not found");
    }

    if (!receiver) {
      throw new NotFoundException("Receiver not found");
    }

    if (sender.userType === receiver.userType) {
      throw new BadRequestException(
        "Messages can only be sent between vendors and buyers",
      );
    }

    const vendorId =
      sender.userType === "vendor" ? sender.vendor?.id : receiver.vendor?.id;
    const buyerId =
      sender.userType === "buyer" ? sender.buyer?.id : receiver.buyer?.id;

    if (!vendorId || !buyerId) {
      throw new BadRequestException("Invalid vendor-buyer relationship");
    }

    return { vendorId, buyerId };
  }

  private async getOrCreateConversation(vendorId: string, buyerId: string) {
    return this.prisma.conversation.upsert({
      where: {
        vendorId_buyerId: {
          vendorId,
          buyerId,
        },
      },
      create: {
        vendorId,
        buyerId,
      },
      update: {},
    });
  }

  private getMessageInclude() {
    return {
      sender: {
        select: {
          ...this.getUserProfileSelect(),
        },
      },
      receiver: {
        select: {
          ...this.getUserProfileSelect(),
        },
      },
    };
  }

  private getUserProfileSelect() {
    return {
      id: true,
      email: true,
      userType: true,
      displayName: true,
      avatarUrl: true,
      buyer: {
        select: {
          id: true,
          userId: true,
          fullName: true,
          profilePhotoUrl: true,
        },
      },
      vendor: {
        select: {
          id: true,
          userId: true,
          fullName: true,
          businessName: true,
          storename: true,
          logoUrl: true,
        },
      },
    };
  }

  private buildConversationPartner(user: any) {
    if (!user) {
      return null;
    }

    const buyer = user.buyer ?? null;
    const vendor = user.vendor ?? null;

    return {
      id: user.id,
      userId: user.id,
      email: user.email,
      userType: user.userType,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      fullName:
        buyer?.fullName ??
        vendor?.fullName ??
        user.displayName ??
        null,
      businessName: vendor?.businessName ?? null,
      storename: vendor?.storename ?? null,
      profilePhotoUrl: buyer?.profilePhotoUrl ?? null,
      logoUrl: vendor?.logoUrl ?? null,
      avatar:
        buyer?.profilePhotoUrl ??
        vendor?.logoUrl ??
        user.avatarUrl ??
        null,
      buyer,
      vendor,
    };
  }

  private getConversationWithPinnedMessageInclude() {
    return {
      buyer: {
        select: {
          id: true,
          userId: true,
          fullName: true,
          user: {
            select: {
              id: true,
              email: true,
              userType: true,
            },
          },
        },
      },
      vendor: {
        select: {
          id: true,
          userId: true,
          businessName: true,
          storename: true,
          user: {
            select: {
              id: true,
              email: true,
              userType: true,
            },
          },
        },
      },
      pinnedMessage: {
        include: this.getMessageInclude(),
      },
    };
  }

  private validateConversationAccess(userId: string, conversation: any) {
    if (
      conversation.buyer.userId !== userId &&
      conversation.vendor.userId !== userId
    ) {
      throw new ForbiddenException("You do not have access to this conversation");
    }
  }

  private handleError(action: string, error: unknown): never {
    if (
      error instanceof NotFoundException ||
      error instanceof ForbiddenException ||
      error instanceof BadRequestException
    ) {
      throw error;
    }

    const message = error instanceof Error ? error.stack : String(error);
    this.logger.error(`Failed to ${action}`, message);
    throw new InternalServerErrorException(`Failed to ${action}`);
  }
}
