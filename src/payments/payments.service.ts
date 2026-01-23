import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import Stripe from "stripe";

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>(
      "STRIPE_SECRET_KEY",
    ) as string;
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
    });
  }

  async createPaymentIntent(
    buyerId: string,
    createPaymentDto: CreatePaymentDto,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: createPaymentDto.orderId },
      include: {
        buyer: true,
        vendor: true,
      },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (order.buyerId !== buyerId) {
      throw new ForbiddenException("You do not have access to this order");
    }

    if (order.status === "cancelled") {
      throw new BadRequestException("Cannot pay for a cancelled order");
    }

    // Check if payment already exists
    const existingPayment = await this.prisma.payment.findUnique({
      where: { orderId: order.id },
    });

    if (existingPayment) {
      if (existingPayment.status === "succeeded") {
        throw new BadRequestException("Order has already been paid");
      }
      // Return existing payment intent
      if (existingPayment.stripePaymentId) {
        return {
          clientSecret: (
            await this.stripe.paymentIntents.retrieve(
              existingPayment.stripePaymentId,
            )
          ).client_secret,
          paymentId: existingPayment.id,
        };
      }
    }

    // Get or create Stripe customer
    let customerId: string | null = null;
    const buyer = order.buyer;

    // Create payment intent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(Number(order.totalAmount) * 100), // Convert to cents
      currency: "usd",
      metadata: {
        orderId: order.id,
        buyerId: buyerId,
        vendorId: order.vendorId,
      },
    });

    // Create payment record
    const payment = await this.prisma.payment.upsert({
      where: { orderId: order.id },
      update: {
        stripePaymentId: paymentIntent.id,
        stripeCustomerId: customerId,
        amount: order.totalAmount,
        status: "pending",
      },
      create: {
        orderId: order.id,
        stripePaymentId: paymentIntent.id,
        stripeCustomerId: customerId,
        amount: order.totalAmount,
        status: "pending",
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
    };
  }

  async confirmPayment(paymentIntentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { stripePaymentId: paymentIntentId },
      include: {
        order: true,
      },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    const paymentIntent =
      await this.stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      // Update payment status
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "succeeded",
        },
      });

      // Update order status if it's still pending
      if (payment.order.status === "pending") {
        await this.prisma.order.update({
          where: { id: payment.orderId },
          data: {
            status: "processing",
          },
        });
      }
    } else if (paymentIntent.status === "canceled") {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "canceled",
        },
      });
    }

    return paymentIntent;
  }

  async getPaymentByOrderId(orderId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: {
        order: true,
      },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    return payment;
  }

  async handleWebhook(signature: string, payload: Buffer) {
    const webhookSecret = this.configService.get<string>(
      "STRIPE_WEBHOOK_SECRET",
    );
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (err) {
      throw new BadRequestException(
        `Webhook signature verification failed: ${err.message}`,
      );
    }

    // Handle the event
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await this.confirmPayment(paymentIntent.id);
    } else if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const payment = await this.prisma.payment.findUnique({
        where: { stripePaymentId: paymentIntent.id },
      });

      if (payment) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "failed",
          },
        });
      }
    }

    return { received: true };
  }
}
