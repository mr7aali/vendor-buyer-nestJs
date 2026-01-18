import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  UseGuards,
  NotFoundException,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserType } from '../auth/dto/register.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('create-intent')
  @UseGuards(JwtAuthGuard)
  @Roles(UserType.BUYER)
  @UseGuards(RolesGuard)
  async createPaymentIntent(
    @Body() createPaymentDto: CreatePaymentDto,
    @GetUser() user: any,
  ) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { userId: user.id },
    });
    if (!buyer) {
      throw new NotFoundException('Buyer profile not found');
    }
    return this.paymentsService.createPaymentIntent(buyer.id, createPaymentDto);
  }

  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard)
  async getPaymentByOrderId(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentByOrderId(orderId);
  }

  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    return this.paymentsService.handleWebhook(signature, req.rawBody as Buffer);
  }
}
