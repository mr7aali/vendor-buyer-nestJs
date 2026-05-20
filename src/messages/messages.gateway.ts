import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { MessagesService } from "./messages.service";
import { ForbiddenException, Logger } from "@nestjs/common";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class MessagesGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(MessagesGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly messagesService: MessagesService,
  ) {}

  afterInit() {
    this.logger.log("WebSocket gateway initialized");
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(" ")[1] ||
        client.handshake.query?.token;

      if (!token) {
        throw new ForbiddenException("No token");
      }

      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      client.join(`user:${payload.sub}`);

      this.logger.log(`Socket connected: ${payload.sub}`);
    } catch (err) {
      this.logger.warn(
        `Socket connection rejected: ${err instanceof Error ? err.message : "unknown error"}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket disconnected: ${client.data.userId ?? client.id}`);
  }

  @SubscribeMessage("send_message")
  async handleSendMessage(
    @MessageBody()
    data: {
      receiverId: string;
      messageText: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const senderId = client.data.userId;
      const message = await this.messagesService.create(senderId, data);

      this.emitNewMessage(message);
      return message;
    } catch (error) {
      this.logger.error(
        `Failed to send message: ${error instanceof Error ? error.message : "unknown error"}`,
      );
      throw error;
    }
  }

  @SubscribeMessage("mark_read")
  async handleRead(
    @MessageBody() messageId: string,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId;
      const message = await this.messagesService.markAsRead(messageId, userId);

      this.server
        .to(`user:${message.senderId}`)
        .emit("message_read", { messageId });
      this.server
        .to(`user:${message.receiverId}`)
        .emit("message_read", { messageId });

      return message;
    } catch (error) {
      this.logger.error(
        `Failed to mark message as read: ${error instanceof Error ? error.message : "unknown error"}`,
      );
      throw error;
    }
  }

  @SubscribeMessage("pin_message")
  async handlePinMessage(
    @MessageBody() data: { messageId: string; conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId;
      const conversation =
        await this.messagesService.getConversationParticipants(
          data.conversationId,
        );

      if (
        conversation.buyer.userId !== userId &&
        conversation.vendor.userId !== userId
      ) {
        throw new ForbiddenException(
          "You do not have access to this conversation",
        );
      }

      const updatedConversation = await this.messagesService.pinMessage(
        data.messageId,
        data.conversationId,
      );

      this.emitMessagePinned(updatedConversation);

      return {
        conversationId: updatedConversation.id,
        pinnedMessageId: updatedConversation.pinnedMessageId,
        pinnedMessage: updatedConversation.pinnedMessage,
      };
    } catch (error) {
      this.logger.error(
        `Failed to pin message: ${error instanceof Error ? error.message : "unknown error"}`,
      );
      throw error;
    }
  }

  emitNewMessage(message: any) {
    if (!this.server || !message?.senderId || !message?.receiverId) {
      return;
    }

    this.server.to(`user:${message.receiverId}`).emit("new_message", message);
    this.server.to(`user:${message.senderId}`).emit("new_message", message);
  }

  emitMessagePinned(conversation: any) {
    if (
      !this.server ||
      !conversation?.buyer?.userId ||
      !conversation?.vendor?.userId
    ) {
      return;
    }

    const payload = {
      conversationId: conversation.id,
      pinnedMessageId: conversation.pinnedMessageId,
      pinnedMessage: conversation.pinnedMessage,
    };

    this.server
      .to(`user:${conversation.buyer.userId}`)
      .emit("message_pinned", payload);
    this.server
      .to(`user:${conversation.vendor.userId}`)
      .emit("message_pinned", payload);
  }
}
