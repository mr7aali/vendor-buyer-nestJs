import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import {
  UpdateOrderStatusDto,
  OrderStatus,
} from "./dto/update-order-status.dto";
import { GetOrdersFilterDto } from "./dto/get-orders-filter.dto";
// import { Prisma } from "@prisma/client"; // Incorrect import
import { Prisma } from "../../generated/prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/dto/create-notification.dto";
import { MessagesService } from "../messages/messages.service";
import { MessagesGateway } from "../messages/messages.gateway";

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private messagesService: MessagesService,
    private messagesGateway: MessagesGateway,
  ) {}

  async create(buyerId: string, createOrderDto: CreateOrderDto) {
    return this.createOrder(buyerId, createOrderDto);
  }

  async createOrder(buyerId: string, createOrderDto: CreateOrderDto) {
    try {
      const connection = await this.prisma.vendorBuyerConnection.findUnique({
        where: {
          vendorId_buyerId: {
            vendorId: createOrderDto.vendorId,
            buyerId,
          },
        },
      });

      if (!connection || !connection.isActive) {
        throw new ForbiddenException("You are not connected to this vendor");
      }

      const cart = await this.prisma.cart.findUnique({
        where: { buyerId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  vendor: true,
                },
              },
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException("Cart is empty");
      }

      const vendorItems = cart.items.filter(
        (item) => item.product.vendorId === createOrderDto.vendorId,
      );

      if (vendorItems.length === 0) {
        throw new BadRequestException("No items from this vendor in cart");
      }

      let subtotal = 0;
      for (const item of vendorItems) {
        if (item.product.stockQuantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${item.product.name}`,
          );
        }
        subtotal += Number(item.priceAtAddition) * item.quantity;
      }

      let discountAmount = 0;
      let couponId: string | null = null;
      if (createOrderDto.couponCode) {
        const coupon = await this.applyCoupon(
          createOrderDto.couponCode,
          createOrderDto.vendorId,
          buyerId,
          subtotal,
        );
        if (coupon) {
          discountAmount = coupon.discount;
          couponId = coupon.couponId;
        }
      }

      const totalAmount = subtotal - discountAmount;
      const orderNumber = this.generateOrderNumber();
      const order = await this.prisma.order.create({
        data: {
          buyerId,
          vendorId: createOrderDto.vendorId,
          orderNumber,
          subtotal,
          discountAmount,
          totalAmount,
          status: OrderStatus.PENDING,
          shippingAddress: createOrderDto.shippingAddress,
          country: createOrderDto.country,
          optionalAddress: createOrderDto.optionalAddress,
        },
      });

      const [buyer, vendor] = await Promise.all([
        this.prisma.buyer.findUnique({
          where: { id: buyerId },
          select: { userId: true, fullName: true },
        }),
        this.prisma.vendor.findUnique({
          where: { id: createOrderDto.vendorId },
          select: { userId: true, storename: true, businessName: true },
        }),
      ]);

      if (buyer?.userId) {
        await this.notificationsService.notifyBuyer(buyer.userId, {
          title: "Order created",
          message: `Your order ${orderNumber} has been placed successfully.`,
          type: NotificationType.SUCCESS,
        });
      }

      if (vendor?.userId) {
        await this.notificationsService.notifyVendor(vendor.userId, {
          title: "New order received",
          message: `You received a new order ${orderNumber}.`,
          type: NotificationType.INFO,
        });
      }

      for (const item of vendorItems) {
        const unitPrice = Number(item.priceAtAddition);
        const totalPrice = unitPrice * item.quantity;

        await this.prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice,
            totalPrice,
          },
        });

        await this.prisma.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      await this.prisma.cartItem.deleteMany({
        where: {
          cartId: cart.id,
          productId: {
            in: vendorItems.map((item) => item.productId),
          },
        },
      });

      if (couponId) {
        const assignment = await this.prisma.couponBuyerAssignment.findUnique({
          where: {
            couponId_buyerId: {
              couponId,
              buyerId,
            },
          },
        });

        if (assignment) {
          await this.prisma.couponBuyerAssignment.update({
            where: { id: assignment.id },
            data: {
              isUsed: true,
              usedAt: new Date(),
            },
          });

          await this.prisma.coupon.update({
            where: { id: couponId },
            data: {
              usedCount: {
                increment: 1,
              },
            },
          });
        }
      }

      await this.sendOrderPlacedAutoMessage({
        orderId: order.id,
        orderNumber: order.orderNumber,
        buyerUserId: buyer?.userId,
        vendorUserId: vendor?.userId,
        vendorItems,
        totalAmount: Number(order.totalAmount),
      });

      return this.prisma.order.findUnique({
        where: { id: order.id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          vendor: {
            select: {
              id: true,
              businessName: true,
            },
          },
        },
      });
    } catch (error) {
      this.handleOrderError("create order", error);
    }
  }

  async findAllByBuyer(buyerId: string) {
    return this.prisma.order.findMany({
      where: { buyerId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            vendorCode: true,
          },
        },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findAllByVendor(vendorId: string) {
    return this.prisma.order.findMany({
      where: { vendorId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        buyer: true,
        vendor: true,
        payments: true,
        _count: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
  async findAllForAdmin(filterDto: GetOrdersFilterDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      sortBy = "createdAt",
      sortOrder = "desc",
      vendorId,
    } = filterDto;

    const skip = (page - 1) * limit;

    const where: Prisma.OrderFindManyArgs["where"] = {};

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by vendor
    if (vendorId) {
      where.vendorId = vendorId;
    }

    // Filter by date range
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Filter by amount range
    if (minAmount !== undefined || maxAmount !== undefined) {
      where.totalAmount = {};
      if (minAmount !== undefined) {
        where.totalAmount.gte = minAmount;
      }
      if (maxAmount !== undefined) {
        where.totalAmount.lte = maxAmount;
      }
    }

    // Search functionality
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        {
          buyer: {
            user: {
              email: { contains: search, mode: "insensitive" },
            },
          },
        },
      ];
    }

    // Dynamic sorting
    const orderBy: Prisma.OrderFindManyArgs["orderBy"] = {};
    if (sortBy === "buyer") {
      orderBy.buyer = { user: { email: sortOrder } };
    } else if (sortBy === "vendor") {
      orderBy.vendor = { businessName: sortOrder };
    } else {
      orderBy[sortBy] = sortOrder;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          subtotal: true,
          discountAmount: true,
          totalAmount: true,
          createdAt: true,
          // buyerId: true,
          updatedAt: true,
          // items: {
          //   select: {
          //     id: true,
          //     quantity: true,
          //     // price: true,
          //     totalPrice: true,
          //     unitPrice: true,
          //     updatedAt: true,

          //     product: {
          //       select: {
          //         id: true,
          //         name: true,
          //         sku: true,
          //         price: true,
          //         // imageUrl: true,
          //       },
          //     },
          //   },
          // },

          buyer: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              // user: {
              //   select: {
              //     id: true,
              //     email: true,
              //   },
              // },
            },
          },

          // vendor: {
          //   select: {
          //     id: true,
          //     fullName: true,
          //     businessName: true,
          //     vendorCode: true,
          //     logoUrl: true,
          //   },
          // },

          // payments: {
          //   select: {
          //     id: true,
          //     amount: true,
          //     status: true,
          //     //  method: true,
          //     createdAt: true,
          //   },
          // },

          _count: {
            select: {
              items: true,
              //  payments: true,
              // productReviews: true,
              // vendorReviews: true,
            },
          },
        },
      }),

      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async orderDetailsForAdmin(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                imageUrl: true,
                vendorId: true,
                categoryId: true,
                images: true,
              },
            },
          },
        },

        buyer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        vendor: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            businessName: true,
            vendorCode: true,
            logoUrl: true,
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        payments: true,
        coupon: {
          select: {
            id: true,
            code: true,
            discountType: true,
            discountValue: true,
            minPurchaseAmount: true,
            maxDiscountAmount: true,
          },
        },
        _count: true,
      },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    return order;
  }
  async findOne(id: string, userId: string, userType: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        buyer: {
          include: {
            user: true,
          },
        },
        vendor: true,
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (userType === "buyer") {
      const buyer = await this.prisma.buyer.findUnique({
        where: { userId },
      });
      if (order.buyerId !== buyer?.id) {
        throw new ForbiddenException("You do not have access to this order");
      }
    } else if (userType === "vendor") {
      const vendor = await this.prisma.vendor.findUnique({
        where: { userId },
      });
      if (order.vendorId !== vendor?.id) {
        throw new ForbiddenException("You do not have access to this order");
      }
    }

    return order;
  }

  async updateStatus(
    id: string,
    vendorId: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return this.updateOrderStatus(id, vendorId, updateOrderStatusDto);
  }

  async updateOrderStatus(
    id: string,
    vendorId: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id },
      });

      if (!order) {
        throw new NotFoundException("Order not found");
      }

      if (order.vendorId !== vendorId) {
        throw new ForbiddenException("You do not have access to this order");
      }

      const updated = await this.prisma.order.update({
        where: { id },
        data: {
          status: updateOrderStatusDto.status,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      const [buyer, vendor] = await Promise.all([
        this.prisma.buyer.findUnique({
          where: { id: order.buyerId },
          select: { userId: true },
        }),
        this.prisma.vendor.findUnique({
          where: { id: order.vendorId },
          select: { userId: true },
        }),
      ]);

      await this.sendOrderUpdatedAutoMessage({
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: updateOrderStatusDto.status,
        vendorUserId: vendor?.userId,
        buyerUserId: buyer?.userId,
      });

      if (
        updateOrderStatusDto.status === OrderStatus.DELIVERED ||
        updateOrderStatusDto.status === OrderStatus.CANCELLED
      ) {
        if (buyer?.userId) {
          await this.notificationsService.notifyBuyer(buyer.userId, {
            title:
              updateOrderStatusDto.status === OrderStatus.DELIVERED
                ? "Order delivered"
                : "Order cancelled",
            message: `Your order ${order.orderNumber} status is now ${updateOrderStatusDto.status.toLowerCase()}.`,
            type:
              updateOrderStatusDto.status === OrderStatus.DELIVERED
                ? NotificationType.SUCCESS
                : NotificationType.WARNING,
          });
        }

        if (vendor?.userId) {
          await this.notificationsService.notifyVendor(vendor.userId, {
            title:
              updateOrderStatusDto.status === OrderStatus.DELIVERED
                ? "Order delivered"
                : "Order cancelled",
            message: `Order ${order.orderNumber} status updated to ${updateOrderStatusDto.status.toLowerCase()}.`,
            type: NotificationType.INFO,
          });
        }

        await this.unpinOrderMessageIfNeeded(order.id);
      }

      return updated;
    } catch (error) {
      this.handleOrderError("update order status", error);
    }
  }

  private async sendOrderPlacedAutoMessage(input: {
    orderId: string;
    orderNumber: string;
    buyerUserId?: string;
    vendorUserId?: string;
    vendorItems: Array<{
      quantity: number;
      priceAtAddition: unknown;
      product: { name: string };
    }>;
    totalAmount: number;
  }) {
    if (!input.buyerUserId || !input.vendorUserId) {
      return;
    }

    const itemDetails = input.vendorItems.map((item) => ({
      productName: item.product.name,
      quantity: item.quantity,
      price: Number(item.priceAtAddition),
    }));

    const firstItem = itemDetails[0];

    try {
      const autoMessage = await this.messagesService.createAutoMessage({
        senderId: input.buyerUserId,
        receiverId: input.vendorUserId,
        type: "ORDER_PLACED",
        orderId: input.orderId,
        messageText: `Order ${input.orderNumber} has been placed.`,
        metadata: {
          orderId: input.orderId,
          orderNumber: input.orderNumber,
          productName: firstItem?.productName ?? "Multiple items",
          quantity:
            firstItem?.quantity ??
            itemDetails.reduce((sum, item) => sum + item.quantity, 0),
          price: firstItem?.price ?? input.totalAmount,
          items: itemDetails,
          totalAmount: input.totalAmount,
        },
      });

      this.messagesGateway.emitNewMessage(autoMessage);
    } catch (error) {
      this.logger.error(
        `Failed to send order placed auto-message: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }

  private async sendOrderUpdatedAutoMessage(input: {
    orderId: string;
    orderNumber: string;
    status: OrderStatus;
    vendorUserId?: string;
    buyerUserId?: string;
  }) {
    if (!input.vendorUserId || !input.buyerUserId) {
      return;
    }

    try {
      const autoMessage = await this.messagesService.createAutoMessage({
        senderId: input.vendorUserId,
        receiverId: input.buyerUserId,
        type: "ORDER_UPDATED",
        orderId: input.orderId,
        messageText: `Order ${input.orderNumber} status updated to ${input.status}.`,
        metadata: {
          orderId: input.orderId,
          orderNumber: input.orderNumber,
          status: input.status,
        },
      });

      this.messagesGateway.emitNewMessage(autoMessage);
    } catch (error) {
      this.logger.error(
        `Failed to send order updated auto-message: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }

  private async unpinOrderMessageIfNeeded(orderId: string) {
    try {
      const conversation = await this.messagesService.unpinMessageByOrderId(orderId);
      if (conversation) {
        this.messagesGateway.emitMessagePinned(conversation);
      }
    } catch (error) {
      this.logger.error(
        `Failed to unpin order message: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }

  private handleOrderError(action: string, error: unknown): never {
    if (
      error instanceof NotFoundException ||
      error instanceof BadRequestException ||
      error instanceof ForbiddenException
    ) {
      throw error;
    }

    this.logger.error(
      `Failed to ${action}`,
      error instanceof Error ? error.stack : String(error),
    );
    throw new InternalServerErrorException(`Failed to ${action}`);
  }

  private generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return `ORD-${timestamp}-${random}`;
  }

  private async applyCoupon(
    couponCode: string,
    vendorId: string,
    buyerId: string,
    subtotal: number,
  ) {
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        code: couponCode,
        vendorId,
        isActive: true,
        validFrom: { lte: new Date() },
        validUntil: { gte: new Date() },
      },
    });

    if (!coupon) {
      return null;
    }

    // Check if coupon is assigned to buyer
    const assignment = await this.prisma.couponBuyerAssignment.findUnique({
      where: {
        couponId_buyerId: {
          couponId: coupon.id,
          buyerId,
        },
      },
    });

    if (!assignment || assignment.isUsed) {
      return null;
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return null;
    }

    // Check minimum purchase amount
    if (
      coupon.minPurchaseAmount &&
      subtotal < Number(coupon.minPurchaseAmount)
    ) {
      return null;
    }

    let discount = 0;
    if (coupon.discountType === "percentage") {
      discount = (subtotal * Number(coupon.discountValue)) / 100;
    } else {
      discount = Number(coupon.discountValue);
    }

    // Don't exceed subtotal
    if (discount > subtotal) {
      discount = subtotal;
    }

    return { couponId: coupon.id, discount };
  }
}
