import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiConsumes,
} from "@nestjs/swagger";
import { MessagesService } from "./messages.service";
import { CreateMessageDto } from "./dto/create-message.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { FileInterceptor } from "@nestjs/platform-express";

@ApiTags("Messages")
@ApiBearerAuth("JWT-auth")
@Controller("messages")
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Send a message",
    description:
      "Send a message to another user. Buyers can only message connected vendors and vice versa.",
  })
  @ApiResponse({ status: 201, description: "Message sent successfully" })
  @ApiResponse({
    status: 400,
    description: "Bad request - Invalid vendor-buyer relationship",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Users must be connected to message each other",
  })
  @ApiBody({ type: CreateMessageDto })
  async create(
    @Body() createMessageDto: CreateMessageDto,
    @GetUser() user: any,
  ) {
    return this.messagesService.create(user.id, createMessageDto);
  }

  @Post("upload-image")
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor("image"))
  @ApiOperation({
    summary: "Upload chat image",
    description: "Upload a chat image to Cloudinary and return a secure URL",
  })
  @ApiConsumes("multipart/form-data")
  @ApiResponse({ status: 201, description: "Image uploaded successfully" })
  @ApiResponse({ status: 400, description: "Bad request - Invalid image file" })
  async uploadImage(@UploadedFile() image: Express.Multer.File) {
    return this.messagesService.uploadChatImage(image);
  }

  @Get("conversations")
  @ApiOperation({
    summary: "Get all conversations",
    description: "Get all conversations with last message and unread count",
  })
  @ApiResponse({
    status: 200,
    description: "Conversations retrieved successfully",
  })
  async getConversations(@GetUser() user: any) {
    return this.messagesService.getConversations(user.id);
  }

  @Get("conversation/:partnerId")
  @ApiOperation({
    summary: "Get messages with a partner",
    description: "Get all messages in a conversation with a specific user",
  })
  @ApiParam({
    name: "partnerId",
    description: "Partner user ID",
    example: "uuid-here",
  })
  @ApiResponse({ status: 200, description: "Messages retrieved successfully" })
  async getMessages(
    @Param("partnerId") partnerId: string,
    @GetUser() user: any,
  ) {
    return this.messagesService.getMessages(user.id, partnerId);
  }

  @Patch(":id/read")
  @ApiOperation({
    summary: "Mark message as read",
    description: "Mark a specific message as read",
  })
  @ApiParam({ name: "id", description: "Message ID", example: "uuid-here" })
  @ApiResponse({
    status: 200,
    description: "Message marked as read successfully",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Can only mark own messages as read",
  })
  @ApiResponse({ status: 404, description: "Message not found" })
  async markAsRead(@Param("id") id: string, @GetUser() user: any) {
    return this.messagesService.markAsRead(id, user.id);
  }

  @Get("conversations/:id/pinned")
  @ApiOperation({
    summary: "Get pinned conversation message",
    description: "Get the currently pinned message for a conversation",
  })
  @ApiParam({
    name: "id",
    description: "Conversation ID",
    example: "uuid-here",
  })
  @ApiResponse({
    status: 200,
    description: "Pinned message retrieved successfully",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - User has no access to this conversation",
  })
  @ApiResponse({ status: 404, description: "Conversation not found" })
  async getPinnedMessage(@Param("id") conversationId: string, @GetUser() user: any) {
    return this.messagesService.getPinnedMessage(user.id, conversationId);
  }
}
