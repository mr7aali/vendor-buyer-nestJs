import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { AdminAuthGuard } from "../auth/guards/admin-auth.guard";
import { BroadcastNotificationDto } from "./dto/broadcast-notification.dto";

@ApiTags("Notifications")
@ApiBearerAuth()
@Controller("notifications")
// @UseGuards(AdminAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a notification",
    description:
      "Create a new notification for a user (typically used by system)",
  })
  @ApiResponse({
    status: 201,
    description: "Notification created successfully",
  })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiBody({ type: CreateNotificationDto })
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Post("broadcast")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Broadcast a notification",
    description: "Send a notification to all users or a specific user group",
  })
  @ApiResponse({
    status: 201,
    description: "Broadcast notifications created successfully",
  })
  @ApiBody({ type: BroadcastNotificationDto })
  async broadcast(@Body() dto: BroadcastNotificationDto) {
    return this.notificationsService.createBroadcast(dto);
  }

  @Get()
  @ApiOperation({
    summary: "Get all notifications",
    description: "Get all notifications (admin view)",
  })
  @ApiResponse({
    status: 200,
    description: "Notifications retrieved successfully",
  })
  async findAll() {
    console.log("Testing 12.21AM");
    return this.notificationsService.findAll();
  }

  @Get("unread")
  @ApiOperation({
    summary: "Get unread notifications",
    description: "Get all unread notifications (admin view)",
  })
  @ApiResponse({
    status: 200,
    description: "Unread notifications retrieved successfully",
  })
  async findUnread() {
    return this.notificationsService.findUnread();
  }

  @Patch(":id/read")
  @ApiOperation({
    summary: "Mark notification as read",
    description: "Mark a specific notification as read",
  })
  @ApiParam({
    name: "id",
    description: "Notification ID",
    example: "uuid-here",
  })
  @ApiResponse({
    status: 200,
    description: "Notification marked as read successfully",
  })
  @ApiResponse({ status: 404, description: "Notification not found" })
  async markAsRead(@Param("id") id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Patch("read-all")
  @ApiOperation({
    summary: "Mark all notifications as read",
    description: "Mark all notifications as read (admin view)",
  })
  @ApiResponse({
    status: 200,
    description: "All notifications marked as read successfully",
    schema: { example: { count: 5 } },
  })
  async markAllAsRead() {
    return this.notificationsService.markAllAsRead();
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Delete notification",
    description: "Delete a specific notification",
  })
  @ApiParam({
    name: "id",
    description: "Notification ID",
    example: "uuid-here",
  })
  @ApiResponse({
    status: 200,
    description: "Notification deleted successfully",
  })
  @ApiResponse({ status: 404, description: "Notification not found" })
  async delete(@Param("id") id: string) {
    return this.notificationsService.delete(id);
  }
}
