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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody, ApiHeader, ApiExcludeEndpoint } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserType } from '../auth/dto/register.dto';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Payments')
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
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create payment intent', description: 'Buyer only: Create a Stripe payment intent for an order. Returns client secret for frontend payment processing.' })
  @ApiResponse({ status: 201, description: 'Payment intent created successfully', schema: { example: { clientSecret: 'pi_xxx_secret_xxx', paymentId: 'uuid' } } })
  @ApiResponse({ status: 400, description: 'Bad request - Order already paid or invalid order' })
  @ApiResponse({ status: 403, description: 'Forbidden - Buyer access required or order does not belong to buyer' })
  @ApiResponse({ status: 404, description: 'Order or buyer not found' })
  @ApiBody({ type: CreatePaymentDto })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get payment by order ID', description: 'Get payment information for a specific order' })
  @ApiParam({ name: 'orderId', description: 'Order ID', example: 'uuid-here' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPaymentByOrderId(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentByOrderId(orderId);
  }

  @Post('webhook')
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Stripe webhook endpoint', description: 'Internal endpoint for Stripe webhook events. Do not call directly.' })
  @ApiHeader({ name: 'stripe-signature', description: 'Stripe webhook signature', required: true })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Webhook signature verification failed' })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    return this.paymentsService.handleWebhook(signature, req.rawBody as Buffer);
  }
}
