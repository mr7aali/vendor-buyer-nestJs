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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { FcmTokenDto } from './dto/fcm-token.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  // ─── FCM Token Endpoints ──────────────────────────────────────────────────────

  @Post('fcm-token')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register FCM device token',
    description:
      'Register a Firebase Cloud Messaging device token for the authenticated user to receive push notifications.',
  })
  @ApiBody({ type: FcmTokenDto })
  @ApiResponse({ status: 201, description: 'FCM token registered successfully' })
  async registerFcmToken(@Body() dto: FcmTokenDto, @GetUser() user: any) {
    return this.notificationsService.registerFcmToken(user.id, dto.token);
  }

  @Delete('fcm-token')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove FCM device token',
    description:
      'Unregister a Firebase Cloud Messaging device token (e.g. on logout).',
  })
  @ApiBody({ type: FcmTokenDto })
  @ApiResponse({ status: 200, description: 'FCM token removed' })
  async removeFcmToken(@Body() dto: FcmTokenDto, @GetUser() user: any) {
    return this.notificationsService.removeFcmToken(user.id, dto.token);
  }

  // ─── Standard Notification Endpoints ─────────────────────────────────────────

  @Post()
  @UseGuards(AdminAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a notification',
    description:
      'Create a new notification for a user (typically used by system)',
  })
  @ApiResponse({
    status: 201,
    description: 'Notification created successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiBody({ type: CreateNotificationDto })
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Post('broadcast')
  @UseGuards(AdminAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Broadcast a notification',
    description: 'Send a notification to all users or a specific user group',
  })
  @ApiResponse({
    status: 201,
    description: 'Broadcast notifications created successfully',
  })
  @ApiBody({ type: BroadcastNotificationDto })
  async broadcast(@Body() dto: BroadcastNotificationDto) {
    return this.notificationsService.createBroadcast(dto);
  }

  @Get()
  @UseGuards(AdminAuthGuard)
  @ApiOperation({
    summary: 'Get all notifications',
    description: 'Get all notifications (admin view)',
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
  })
  async findAll() {
    return this.notificationsService.findAll();
  }

  @Get('broadcasts')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({
    summary: 'Get broadcasts',
    description: 'Get grouped broadcast notifications (admin view)',
  })
  @ApiResponse({
    status: 200,
    description: 'Broadcasts retrieved successfully',
  })
  async listBroadcasts() {
    return this.notificationsService.listBroadcasts();
  }

  @Get('broadcasts/:broadcastId/recipients')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({
    summary: 'Get broadcast recipients',
    description: 'Get notifications for a specific broadcast',
  })
  @ApiParam({
    name: 'broadcastId',
    description: 'Broadcast ID',
    example: 'uuid-here',
  })
  @ApiResponse({
    status: 200,
    description: 'Broadcast recipients retrieved successfully',
  })
  async listBroadcastRecipients(@Param('broadcastId') broadcastId: string) {
    return this.notificationsService.listBroadcastRecipients(broadcastId);
  }

  @Get('unread')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({
    summary: 'Get unread notifications',
    description: 'Get all unread notifications (admin view)',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread notifications retrieved successfully',
  })
  async findUnread() {
    return this.notificationsService.findUnread();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get my notifications',
    description: 'Get notifications for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
  })
  async findMyNotifications(@GetUser() user: any) {
    return this.notificationsService.findAllByUser(user.id);
  }

  @Get('me/unread')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get my unread notifications',
    description: 'Get unread notifications for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread notifications retrieved successfully',
  })
  async findMyUnreadNotifications(@GetUser() user: any) {
    return this.notificationsService.findUnreadByUser(user.id);
  }

  @Patch(':id/read')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({
    summary: 'Mark notification as read',
    description: 'Mark a specific notification as read',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    example: 'uuid-here',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read successfully',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Patch('read-all')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Mark all notifications as read (admin view)',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read successfully',
    schema: { example: { count: 5 } },
  })
  async markAllAsRead() {
    return this.notificationsService.markAllAsRead();
  }

  @Patch('me/:id/read')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Mark my notification as read',
    description: 'Mark a specific notification as read for the user',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    example: 'uuid-here',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read successfully',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markMyNotificationRead(@Param('id') id: string, @GetUser() user: any) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Patch('me/read-all')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Mark all my notifications as read',
    description: 'Mark all notifications as read for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read successfully',
    schema: { example: { count: 5 } },
  })
  async markAllMyNotificationsRead(@GetUser() user: any) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete notification',
    description: 'Delete a specific notification',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    example: 'uuid-here',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async delete(@Param('id') id: string) {
    return this.notificationsService.delete(id);
  }

  @Delete('me/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete my notification',
    description: 'Delete a specific notification for the authenticated user',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    example: 'uuid-here',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async deleteMyNotification(@Param('id') id: string, @GetUser() user: any) {
    return this.notificationsService.delete(id, user.id);
  }
}
