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
  Delete,
} from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody, ApiHeader, ApiExcludeEndpoint } from '@nestjs/swagger';
import { PaymentsService } from "./payments.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { UserType } from "../auth/dto/register.dto";
import { PrismaService } from "../prisma/prisma.service";

// @ApiTags("Payments")
@Controller("payments")
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  // @ApiBody({ type: CreatePaymentDto })
  @Post("create-intent")
  @UseGuards(JwtAuthGuard)
  @Roles(UserType.BUYER)
  // @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  async createPaymentIntent(
    @Body() createPaymentDto: CreatePaymentDto,
    @GetUser() user: any,
  ) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { userId: user.id },
    });
    if (!buyer) {
      throw new NotFoundException("Buyer profile not found");
    }
    return this.paymentsService.createPaymentIntent(buyer.id, createPaymentDto);
  }

  @Get("order/:orderId")
  @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth("JWT-auth")
  // @ApiOperation({
  //   summary: "Get payment by order ID",
  //   description: "Get payment information for a specific order",
  // })
  // @ApiParam({ name: "orderId", description: "Order ID", example: "uuid-here" })
  // @ApiResponse({ status: 200, description: "Payment retrieved successfully" })
  // @ApiResponse({ status: 404, description: "Payment not found" })
  async getPaymentByOrderId(@Param("orderId") orderId: string) {
    return this.paymentsService.getPaymentByOrderId(orderId);
  }

  @Post("webhook")
  // @ApiExcludeEndpoint()
  // @ApiOperation({
  //   summary: "Stripe webhook endpoint",
  //   description:
  //     "Internal endpoint for Stripe webhook events. Do not call directly.",
  // })
  // @ApiHeader({
  //   name: "stripe-signature",
  //   description: "Stripe webhook signature",
  //   required: true,
  // })
  // @ApiResponse({ status: 200, description: "Webhook processed successfully" })
  // @ApiResponse({
  //   status: 400,
  //   description: "Webhook signature verification failed",
  // })
  async handleWebhook(
    @Headers("stripe-signature") signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    return this.paymentsService.handleWebhook(signature, req.rawBody as Buffer);
  }
  @Get()
  async getAll() {
    return this.prisma.payment.findMany({});
  }
  @Delete()
  async getDelete() {
    return this.prisma.payment.deleteMany({});
  }
}
