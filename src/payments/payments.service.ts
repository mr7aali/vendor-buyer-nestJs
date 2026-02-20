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
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/dto/create-notification.dto";

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
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

  private getCommissionRate(): number {
    const raw = this.configService.get<string>("ADMIN_COMMISSION_RATE");
    if (!raw) {
      return 0.1;
    }
    const parsed = Number(raw);
    if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
      return 0.1;
    }
    const normalized = parsed > 1 ? parsed / 100 : parsed;
    return Math.min(Math.max(normalized, 0), 1);
  }

  private roundMoney(value: number): number {
    return Number(value.toFixed(2));
  }

  private getConnectReturnUrl(): string {
    return (
      this.configService.get<string>("STRIPE_CONNECT_RETURN_URL") ||
      this.configService.get<string>("FRONTEND_URL") ||
      this.configService.get<string>("APP_BASE_URL") ||
      "https://example.com"
    );
  }

  private getConnectRefreshUrl(): string {
    return (
      this.configService.get<string>("STRIPE_CONNECT_REFRESH_URL") ||
      this.configService.get<string>("FRONTEND_URL") ||
      this.configService.get<string>("APP_BASE_URL") ||
      "https://example.com"
    );
  }

  async createVendorStripeAccount(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { user: true },
    });

    if (!vendor) {
      throw new NotFoundException("Vendor not found");
    }

    if (vendor.stripeAccountId) {
      return {
        stripeAccountId: vendor.stripeAccountId,
        chargesEnabled: vendor.stripeChargesEnabled,
        payoutsEnabled: vendor.stripePayoutsEnabled,
        status: vendor.stripeAccountStatus ?? "pending",
      };
    }

    const account = await this.stripe.accounts.create({
      type: "express",
      email: vendor.user?.email ?? undefined,
      business_type: "individual",
      metadata: {
        vendorId: vendor.id,
        vendorCode: vendor.vendorCode,
      },
    });

    await this.prisma.vendor.update({
      where: { id: vendor.id },
      data: {
        stripeAccountId: account.id,
        stripeAccountStatus: "pending",
        stripeChargesEnabled: account.charges_enabled ?? false,
        stripePayoutsEnabled: account.payouts_enabled ?? false,
      },
    });

    return {
      stripeAccountId: account.id,
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      status: "pending",
    };
  }

  async createVendorStripeAccountLink(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor?.stripeAccountId) {
      throw new BadRequestException("Vendor is not onboarded to Stripe");
    }

    const accountLink = await this.stripe.accountLinks.create({
      account: vendor.stripeAccountId,
      refresh_url: this.getConnectRefreshUrl(),
      return_url: this.getConnectReturnUrl(),
      type: "account_onboarding",
    });
    console.log(accountLink);
    return { url: accountLink.url, expiresAt: accountLink.expires_at };
  }

  async getVendorStripeAccountStatus(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor?.stripeAccountId) {
      throw new BadRequestException("Vendor is not onboarded to Stripe");
    }

    const account = await this.stripe.accounts.retrieve(vendor.stripeAccountId);

    await this.prisma.vendor.update({
      where: { id: vendor.id },
      data: {
        stripeAccountStatus:
          account.charges_enabled && account.payouts_enabled
            ? "verified"
            : "pending",
        stripeChargesEnabled: account.charges_enabled ?? false,
        stripePayoutsEnabled: account.payouts_enabled ?? false,
      },
    });

    return {
      stripeAccountId: vendor.stripeAccountId,
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      status:
        account.charges_enabled && account.payouts_enabled
          ? "verified"
          : "pending",
    };
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

    const vendorStripeAccountId = order.vendor?.stripeAccountId;
    if (!vendorStripeAccountId) {
      throw new BadRequestException("Vendor is not onboarded to Stripe");
    }

    if (
      order.vendor?.stripeChargesEnabled === false ||
      order.vendor?.stripePayoutsEnabled === false
    ) {
      throw new BadRequestException(
        "Vendor Stripe account is not fully enabled",
      );
    }

    // Check if payment already exists
    const existingPayment = await this.prisma.payment.findUnique({
      where: { orderId: order.id },
    });

    if (existingPayment) {
      if (existingPayment.status === "succeeded") {
        throw new BadRequestException("Order has already been paid");
      }

      // Return existing checkout session if still valid
      if (existingPayment.stripePaymentId) {
        try {
          const session = await this.stripe.checkout.sessions.retrieve(
            existingPayment.stripePaymentId,
          );

          // Check if session is still open (not expired)
          if (session.status === "open") {
            return {
              success: true,
              paymentId: existingPayment.id,
              sessionId: session.id,
              paymentLink: session.url,
              expiresAt: new Date(session.expires_at * 1000).toISOString(),
              orderId: order.id,
              orderNumber: order.orderNumber,
              amount: Number(order.totalAmount),
              message: "Using existing payment session",
            };
          }
        } catch (error) {
          // Session might be expired or deleted, create a new one
          console.log("Previous session not available, creating new one");
        }
      }
    }

    const totalAmount = Number(order.totalAmount);
    const commissionRate = this.getCommissionRate();
    const adminCommissionAmount = this.roundMoney(totalAmount * commissionRate);
    const vendorPayoutAmount = this.roundMoney(
      totalAmount - adminCommissionAmount,
    );

    // Build success and cancel URLs with order info
    const baseUrl =
      this.configService.get<string>("FRONTEND_URL") || "https://example.com";
    const successUrl = `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`;
    const cancelUrl = `${baseUrl}/payment/cancel?order_id=${order.id}`;

    // Create checkout session
    const checkoutSession = await this.stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(totalAmount * 100),
            product_data: {
              name: `Order #${order.orderNumber}`,
              description: `Payment for order from ${order.vendor.storename}`,
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: Math.round(adminCommissionAmount * 100),
        transfer_data: {
          destination: vendorStripeAccountId,
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        orderId: order.id,
        buyerId: buyerId,
        vendorId: order.vendorId,
        orderNumber: order.orderNumber,
        commissionRate: commissionRate.toString(),
        adminCommissionAmount: adminCommissionAmount.toFixed(2),
        vendorPayoutAmount: vendorPayoutAmount.toFixed(2),
      },
      // customer_email: order.buyer.user.email,
      expires_at: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
    });

    // Create or update payment record
    const payment = await this.prisma.payment.upsert({
      where: { orderId: order.id },
      update: {
        stripePaymentId: checkoutSession.id,
        stripeCustomerId: checkoutSession.customer as string | null,
        amount: order.totalAmount,
        adminCommissionAmount,
        vendorPayoutAmount,
        status: "pending",
      },
      create: {
        orderId: order.id,
        stripePaymentId: checkoutSession.id,
        stripeCustomerId: checkoutSession.customer as string | null,
        amount: order.totalAmount,
        adminCommissionAmount,
        vendorPayoutAmount,
        status: "pending",
      },
    });

    return {
      success: true,
      paymentId: payment.id,
      sessionId: checkoutSession.id,
      paymentLink: checkoutSession.url,
      expiresAt: new Date(checkoutSession.expires_at * 1000).toISOString(),
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: totalAmount,
      adminCommissionAmount,
      vendorPayoutAmount,
    };
  }

  async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const orderId = session.metadata?.orderId;

    if (!orderId) {
      console.error("No orderId in session metadata");
      return;
    }

    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: {
        order: {
          include: {
            buyer: true,
            vendor: true,
          },
        },
      },
    });

    if (!payment) {
      console.error(`Payment not found for order: ${orderId}`);
      return;
    }

    // Update payment status
    const paymentAmount = Number(payment.amount);
    const commissionRate = this.getCommissionRate();
    const adminCommissionAmount = this.roundMoney(
      paymentAmount * commissionRate,
    );
    const vendorPayoutAmount = this.roundMoney(
      paymentAmount - adminCommissionAmount,
    );

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "succeeded",
        stripeCustomerId: session.customer as string | null,
        adminCommissionAmount,
        vendorPayoutAmount,
      },
    });

    // Update order status
    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: {
        status: "processing",
      },
    });

    if (payment.order?.buyer?.userId) {
      await this.notificationsService.notifyBuyer(payment.order.buyer.userId, {
        title: "Payment succeeded",
        message: `Payment received for order ${payment.order.orderNumber}. Amount: $${paymentAmount.toFixed(
          2,
        )}.`,
        type: NotificationType.SUCCESS,
      });
    }

    if (payment.order?.vendor?.userId) {
      await this.notificationsService.notifyVendor(
        payment.order.vendor.userId,
        {
          title: "Payment received",
          message: `Payment received for order ${payment.order.orderNumber}. Payout: $${vendorPayoutAmount.toFixed(
            2,
          )}. Admin commission: $${adminCommissionAmount.toFixed(2)}.`,
          type: NotificationType.SUCCESS,
        },
      );
    }

    console.log(`Payment succeeded for order: ${orderId}`);
  }

  async handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
    const orderId = session.metadata?.orderId;

    if (!orderId) {
      return;
    }

    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
    });

    if (payment && payment.status === "pending") {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "canceled",
        },
      });
    }
  }

  async getPaymentByOrderId(orderId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: {
        order: {
          include: {
            buyer: true,
            vendor: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    return payment;
  }

  async getPaymentStatus(sessionId: string) {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);

      const payment = await this.prisma.payment.findUnique({
        where: { stripePaymentId: sessionId },
        include: {
          order: true,
        },
      });

      return {
        sessionStatus: session.status,
        paymentStatus: session.payment_status,
        paymentRecord: payment,
      };
    } catch (error) {
      throw new NotFoundException("Checkout session not found");
    }
  }

  async handleWebhook(signature: string, payload: Buffer) {
    const webhookSecret = this.configService.get<string>(
      "STRIPE_WEBHOOK_SECRET",
    );
    console.log("ERROR:Webhook called ", signature, payload.toString());
    console.log(signature, payload);
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

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed":
        const completedSession = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutSessionCompleted(completedSession);
        break;

      case "checkout.session.expired":
        const expiredSession = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutSessionExpired(expiredSession);
        break;

      case "checkout.session.async_payment_succeeded":
        const asyncSuccessSession = event.data
          .object as Stripe.Checkout.Session;
        await this.handleCheckoutSessionCompleted(asyncSuccessSession);
        break;

      case "checkout.session.async_payment_failed":
        const asyncFailedSession = event.data.object as Stripe.Checkout.Session;
        const orderId = asyncFailedSession.metadata?.orderId;
        if (orderId) {
          const payment = await this.prisma.payment.findUnique({
            where: { orderId },
          });
          if (payment) {
            await this.prisma.payment.update({
              where: { id: payment.id },
              data: { status: "failed" },
            });
          }
        }
        break;

      case "account.updated":
        const updatedAccount = event.data.object as Stripe.Account;
        await this.updateVendorStripeAccountStatus(updatedAccount);
        break;

      case "account.application.deauthorized":
        const deauthorized = event.data.object as unknown as Stripe.Account;
        await this.updateVendorStripeAccountStatus(deauthorized, true);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  private async updateVendorStripeAccountStatus(
    account: Stripe.Account,
    deauthorized: boolean = false,
  ) {
    console.log(account);
    const chargesEnabled = deauthorized
      ? false
      : (account.charges_enabled ?? false);
    const payoutsEnabled = deauthorized
      ? false
      : (account.payouts_enabled ?? false);

    let status = "pending";
    if (chargesEnabled && payoutsEnabled) {
      status = "verified";
    }
    if (account.requirements?.disabled_reason || deauthorized) {
      status = "restricted";
    }

    await this.prisma.vendor.updateMany({
      where: { stripeAccountId: account.id },
      data: {
        stripeChargesEnabled: chargesEnabled,
        stripePayoutsEnabled: payoutsEnabled,
        stripeAccountStatus: status,
      },
    });
  }
}
