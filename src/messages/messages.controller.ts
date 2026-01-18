import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  async create(@Body() createMessageDto: CreateMessageDto, @GetUser() user: any) {
    return this.messagesService.create(user.id, createMessageDto);
  }

  @Get('conversations')
  async getConversations(@GetUser() user: any) {
    return this.messagesService.getConversations(user.id);
  }

  @Get('conversation/:partnerId')
  async getMessages(
    @Param('partnerId') partnerId: string,
    @GetUser() user: any,
  ) {
    return this.messagesService.getMessages(user.id, partnerId);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @GetUser() user: any) {
    return this.messagesService.markAsRead(id, user.id);
  }
}
