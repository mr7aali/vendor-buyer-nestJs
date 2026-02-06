import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ChattingWithAdminService } from "./chatting-with-admin.service";
import { AdminAuthGuard } from "../auth/guards/admin-auth.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { CreateAdminChatMessageDto } from "./dto/create-admin-chat-message.dto";
import { CreateUserChatMessageDto } from "./dto/create-user-chat-message.dto";
import { CreateAdminChatThreadDto } from "./dto/create-admin-chat-thread.dto";

@ApiTags("Admin Chats")
@Controller("admin-chats")
export class ChattingWithAdminController {
  constructor(private readonly chatService: ChattingWithAdminService) {}

  // =====================
  // ADMIN ENDPOINTS
  // =====================
  @Get("admin/conversations")
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Get admin chat conversations" })
  @ApiResponse({ status: 200, description: "Conversations retrieved" })
  async getAdminConversations() {
    return this.chatService.getAdminConversations();
  }

  @Get("admin/threads/:threadId/messages")
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiParam({ name: "threadId", description: "Chat thread ID" })
  @ApiOperation({ summary: "Get messages for a chat thread (admin)" })
  @ApiResponse({ status: 200, description: "Messages retrieved" })
  async getAdminMessages(@Param("threadId") threadId: string) {
    return this.chatService.getAdminMessages(threadId);
  }

  @Post("admin/threads/:threadId/messages")
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiBody({ type: CreateAdminChatMessageDto })
  @ApiParam({ name: "threadId", description: "Chat thread ID" })
  @ApiOperation({ summary: "Send a message as admin" })
  @ApiResponse({ status: 201, description: "Message sent" })
  async sendAdminMessage(
    @Param("threadId") threadId: string,
    @Body() body: CreateAdminChatMessageDto,
    @GetUser() admin: any,
  ) {
    return this.chatService.sendAdminMessage(
      Number(admin.id),
      threadId,
      body.messageText,
    );
  }

  @Post("admin/threads")
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiBody({ type: CreateAdminChatThreadDto })
  @ApiOperation({ summary: "Create or get a chat thread (admin)" })
  @ApiResponse({ status: 201, description: "Thread created or returned" })
  async createThread(@Body() body: CreateAdminChatThreadDto) {
    return this.chatService.createThreadForAdmin(body);
  }

  // =====================
  // USER ENDPOINTS
  // =====================
  @Get("user/thread")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Get or create user chat thread" })
  @ApiResponse({ status: 200, description: "Thread retrieved" })
  async getUserThread(@GetUser() user: any) {
    return this.chatService.getOrCreateUserThread(user.id);
  }

  @Get("user/messages")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Get user chat messages" })
  @ApiResponse({ status: 200, description: "Messages retrieved" })
  async getUserMessages(@GetUser() user: any) {
    return this.chatService.getUserMessages(user.id);
  }

  @Post("user/messages")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiBody({ type: CreateUserChatMessageDto })
  @ApiOperation({ summary: "Send a message as buyer/vendor" })
  @ApiResponse({ status: 201, description: "Message sent" })
  async sendUserMessage(
    @Body() body: CreateUserChatMessageDto,
    @GetUser() user: any,
  ) {
    return this.chatService.sendUserMessage(user.id, body.messageText);
  }
}
