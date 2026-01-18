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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a notification', description: 'Create a new notification for a user (typically used by system)' })
  @ApiResponse({ status: 201, description: 'Notification created successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiBody({ type: CreateNotificationDto })
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all notifications', description: 'Get all notifications for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  async findAll(@GetUser() user: any) {
    return this.notificationsService.findAllByUser(user.id);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread notifications', description: 'Get all unread notifications for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Unread notifications retrieved successfully' })
  async findUnread(@GetUser() user: any) {
    return this.notificationsService.findUnreadByUser(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read', description: 'Mark a specific notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID', example: 'uuid-here' })
  @ApiResponse({ status: 200, description: 'Notification marked as read successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Can only mark own notifications as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(@Param('id') id: string, @GetUser() user: any) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read', description: 'Mark all notifications for the authenticated user as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read successfully', schema: { example: { count: 5 } } })
  async markAllAsRead(@GetUser() user: any) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete notification', description: 'Delete a specific notification' })
  @ApiParam({ name: 'id', description: 'Notification ID', example: 'uuid-here' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Can only delete own notifications' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async delete(@Param('id') id: string, @GetUser() user: any) {
    return this.notificationsService.delete(id, user.id);
  }
}
