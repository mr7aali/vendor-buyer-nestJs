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
import { ForbiddenException } from "@nestjs/common";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class MessagesGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly messagesService: MessagesService,
  ) {
    console.log("🚀 MessagesGateway constructor called");
  }

  // =====================
  // GATEWAY INITIALIZATION
  // =====================
  afterInit(server: Server) {
    console.log("✅ WebSocket Gateway initialized");
    console.log("📡 WebSocket server is ready to accept connections");
  }

  // =====================
  // CONNECTION
  // =====================
  async handleConnection(client: Socket) {
    console.log("\n🔌 New connection attempt...");
    console.log("Client ID:", client.id);

    try {
      // Log handshake details
      console.log("📋 Handshake Auth:", client.handshake.auth);
      console.log("📋 Handshake Headers:", client.handshake.headers);
      console.log("📋 Handshake Query:", client.handshake.query);

      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(" ")[1] ||
        client.handshake.query?.token; // Added query param support

      console.log("🔑 Token found:", token ? "Yes ✅" : "No ❌");

      if (!token) {
        console.log("❌ No token provided - disconnecting client");
        throw new ForbiddenException("No token");
      }

      console.log("🔐 Verifying token...");
      const payload = this.jwtService.verify(token);
      console.log("✅ Token verified successfully");
      console.log("👤 User payload:", payload);

      client.data.userId = payload.sub;

      // Join personal room
      client.join(`user:${payload.sub}`);
      console.log(`🏠 User joined room: user:${payload.sub}`);

      console.log("✅ User connected successfully:", payload.sub);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    } catch (err) {
      console.log("❌ Connection error:", err.message);
      console.log("🔴 Error details:", err);
      console.log("🚫 Disconnecting client...");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log("\n🔌 Client disconnected");
    console.log("Client ID:", client.id);
    console.log("User ID:", client.data.userId || "Unknown");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
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
    console.log("\n📨 Received 'send_message' event");
    console.log("From User ID:", client.data.userId);
    console.log("Message Data:", data);

    try {
      const senderId = client.data.userId;

      console.log("💾 Creating message in database...");
      const message = await this.messagesService.create(senderId, data);
      console.log("✅ Message created:", message.id);

      // Emit to receiver
      console.log(`📤 Emitting to receiver room: user:${data.receiverId}`);
      this.server.to(`user:${data.receiverId}`).emit("new_message", message);

      // Emit back to sender (sync UI)
      console.log(`📤 Emitting to sender room: user:${senderId}`);
      this.server.to(`user:${senderId}`).emit("new_message", message);

      console.log("✅ Message sent successfully");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

      return message;
    } catch (error) {
      console.log("❌ Error sending message:", error.message);
      console.log("🔴 Error details:", error);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      throw error;
    }
  }

  // =====================
  // READ RECEIPT
  // =====================
  @SubscribeMessage("mark_read")
  async handleRead(
    @MessageBody() messageId: string,
    @ConnectedSocket() client: Socket,
  ) {
    console.log("\n👁️ Received 'mark_read' event");
    console.log("From User ID:", client.data.userId);
    console.log("Message ID:", messageId);

    try {
      const userId = client.data.userId;

      console.log("💾 Marking message as read...");
      const message = await this.messagesService.markAsRead(messageId, userId);
      console.log("✅ Message marked as read");

      // Notify sender
      console.log(`📤 Notifying sender room: user:${message.senderId}`);
      this.server
        .to(`user:${message.senderId}`)
        .emit("message_read", { messageId });

      console.log("✅ Read receipt sent successfully");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

      return message;
    } catch (error) {
      console.log("❌ Error marking message as read:", error.message);
      console.log("🔴 Error details:", error);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      throw error;
    }
  }
}
// ```

// ## What These Logs Will Show You:

// ### On Server Start:
// ```
// 🚀 MessagesGateway constructor called
// ✅ WebSocket Gateway initialized
// 📡 WebSocket server is ready to accept connections
// ```

// ### On Connection Attempt:
// ```
// 🔌 New connection attempt...
// Client ID: abc123
// 📋 Handshake Auth: { token: undefined }
// 📋 Handshake Headers: { authorization: 'Bearer xyz...' }
// 🔑 Token found: Yes ✅
// 🔐 Verifying token...
// ✅ Token verified successfully
// 👤 User payload: { sub: 'user-id-123', ... }
// 🏠 User joined room: user:user-id-123
// ✅ User connected successfully: user-id-123
// ```

// ### On Failed Connection:
// ```
// 🔌 New connection attempt...
// 🔑 Token found: No ❌
// ❌ No token provided - disconnecting client
// 🚫 Disconnecting client...
// ```

// ### On Message Send:
// ```
// 📨 Received 'send_message' event
// From User ID: user-id-123
// Message Data: { receiverId: 'user-id-456', messageText: 'Hello!' }
// 💾 Creating message in database...
// ✅ Message created: msg-id-789
// 📤 Emitting to receiver room: user:user-id-456
// 📤 Emitting to sender room: user:user-id-123
// ✅ Message sent successfully
