import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { MessagesService } from "./messages.service";
import { ForbiddenException } from "@nestjs/common";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly messagesService: MessagesService,
  ) {}

  // =====================
  // CONNECTION
  // =====================
  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(" ")[1];

      if (!token) throw new ForbiddenException("No token");

      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;

      // Join personal room
      client.join(`user:${payload.sub}`);

      console.log("User connected:", payload.sub);
    } catch (err) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log("User disconnected:", client.data.userId);
  }

  // =====================
  // SEND MESSAGE
  // =====================
  @SubscribeMessage("send_message")
  async handleSendMessage(
    @MessageBody()
    data: {
      receiverId: string;
      messageText: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const senderId = client.data.userId;

    const message = await this.messagesService.create(senderId, data);

    // Emit to receiver
    this.server.to(`user:${data.receiverId}`).emit("new_message", message);

    // Emit back to sender (sync UI)
    this.server.to(`user:${senderId}`).emit("new_message", message);

    return message;
  }

  // =====================
  // READ RECEIPT
  // =====================
  @SubscribeMessage("mark_read")
  async handleRead(
    @MessageBody() messageId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;

    const message = await this.messagesService.markAsRead(messageId, userId);

    // Notify sender
    this.server
      .to(`user:${message.senderId}`)
      .emit("message_read", { messageId });

    return message;
  }
}
