import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { ForbiddenException } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { ChattingWithAdminService } from "./chatting-with-admin.service";
import { AdminChatSenderType } from "generated/prisma/enums";

@WebSocketGateway({
  cors: { origin: "*" },
  namespace: "/admin-chats",
})
export class ChattingWithAdminGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly chatService: ChattingWithAdminService,
  ) {}

  afterInit() {
    console.log("✅ Admin chat gateway initialized");
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(" ")[1] ||
        client.handshake.query?.token;

      if (!token) {
        throw new ForbiddenException("No token provided");
      }

      let payload: any;
      let isAdmin = false;

      try {
        payload = this.jwtService.verify(token);
      } catch (err) {
        const adminSecret =
          this.configService.get("JWT_ADMIN_ACCESS_SECRET") ||
          "JWT_ADMIN_ACCESS_SECRET";
        payload = this.jwtService.verify(token, { secret: adminSecret });
        if (payload.type !== "ADMIN") {
          throw err;
        }
        isAdmin = true;
      }

      if (isAdmin) {
        client.data.type = AdminChatSenderType.ADMIN;
        client.data.adminId = payload.sub;
        client.join("admin-chat-admins");

        const threadIds = await this.chatService.getAllThreadIds();
        threadIds.forEach((threadId) =>
          client.join(`admin-chat-thread:${threadId}`),
        );
        return;
      }

      client.data.type = payload.userType || "USER";
      client.data.userId = payload.sub;
      const thread = await this.chatService.getOrCreateUserThread(payload.sub);
      client.data.threadId = thread.id;
      client.join(`admin-chat-thread:${thread.id}`);
    } catch (err) {
      console.log("Admin chat connection error:", err.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log("Admin chat socket disconnected:", client.id);
  }

  @SubscribeMessage("admin_chat_send")
  async handleSend(
    @MessageBody()
    data: {
      threadId?: string;
      messageText: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.messageText) {
      throw new ForbiddenException("Message text is required");
    }

    if (client.data.type === AdminChatSenderType.ADMIN) {
      if (!data.threadId) {
        throw new ForbiddenException("threadId is required");
      }

      const message = await this.chatService.sendAdminMessage(
        Number(client.data.adminId),
        data.threadId,
        data.messageText,
      );

      this.server
        .to(`admin-chat-thread:${data.threadId}`)
        .emit("admin_chat_new_message", message);
      this.server.to("admin-chat-admins").emit("admin_chat_new_message", message);
      return message;
    }

    const message = await this.chatService.sendUserMessage(
      client.data.userId,
      data.messageText,
    );

    this.server
      .to(`admin-chat-thread:${message.threadId}`)
      .emit("admin_chat_new_message", message);
    this.server.to("admin-chat-admins").emit("admin_chat_new_message", message);

    return message;
  }
}
