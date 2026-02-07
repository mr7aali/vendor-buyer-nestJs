import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import {
  UpdateOrderStatusDto,
  OrderStatus,
} from "./dto/update-order-status.dto";
import { v4 as uuidv4 } from "uuid";
import { GetOrdersFilterDto } from "./dto/get-orders-filter.dto";
// import { Prisma } from "@prisma/client"; // Incorrect import
import { Prisma } from "../../generated/prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/dto/create-notification.dto";

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(buyerId: string, createOrderDto: CreateOrderDto) {
    // Verify connection
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

    // Get cart
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

    // Filter items by vendor
    const vendorItems = cart.items.filter(
      (item) => item.product.vendorId === createOrderDto.vendorId,
    );

    if (vendorItems.length === 0) {
      throw new BadRequestException("No items from this vendor in cart");
    }

    // Calculate totals
    let subtotal = 0;
    for (const item of vendorItems) {
      if (item.product.stockQuantity < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${item.product.name}`,
        );
      }
      subtotal += Number(item.priceAtAddition) * item.quantity;
    }

    // Apply coupon if provided
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

    // Create order
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
      },
    });

    const [buyer, vendor] = await Promise.all([
      this.prisma.buyer.findUnique({
        where: { id: buyerId },
        select: { userId: true, fulllName: true },
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

    // Create order items and update stock
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

      // Update stock
      await this.prisma.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: {
            decrement: item.quantity,
          },
        },
      });
    }

    // Remove items from cart
    await this.prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        productId: {
          in: vendorItems.map((item) => item.productId),
        },
      },
    });

    // Mark coupon as used if applicable
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
              fulllName: true,
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
          //     fulllName: true,
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
            fulllName: true,
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
            fulllName: true,
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

    if (
      updateOrderStatusDto.status === OrderStatus.DELIVERED ||
      updateOrderStatusDto.status === OrderStatus.CANCELLED
    ) {
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
    }

    return updated;
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
