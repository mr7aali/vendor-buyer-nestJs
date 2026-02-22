import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AdminTransactionHistoryQueryDto } from "./dto/admin-transaction-history-query.dto";
import {
  TransactionHistoryQueryDto,
  TransactionSortBy,
} from "./dto/transaction-history-query.dto";

@Injectable()
export class TransactionHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getBuyerTransactionHistory(
    userId: string,
    query: TransactionHistoryQueryDto,
  ) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!buyer) {
      throw new NotFoundException("Buyer profile not found");
    }

    const where = this.buildWhereClause(query, {
      buyerId: buyer.id,
    });

    return this.getPaginatedTransactions(where, query);
  }

  async getVendorTransactionHistory(
    userId: string,
    query: TransactionHistoryQueryDto,
  ) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!vendor) {
      throw new NotFoundException("Vendor profile not found");
    }

    const where = this.buildWhereClause(query, {
      vendorId: vendor.id,
    });

    return this.getPaginatedTransactions(where, query);
  }

  async getAdminTransactionHistory(query: AdminTransactionHistoryQueryDto) {
    const where = this.buildWhereClause(query, {
      buyerId: query.buyerId,
      vendorId: query.vendorId,
    });

    return this.getPaginatedTransactions(where, query);
  }

  private buildWhereClause(
    query: TransactionHistoryQueryDto,
    scope: { buyerId?: string; vendorId?: string },
  ): Prisma.PaymentWhereInput {
    const andConditions: Prisma.PaymentWhereInput[] = [];

    const relationFilter: Prisma.OrderWhereInput = {};
    if (scope.buyerId) {
      relationFilter.buyerId = scope.buyerId;
    }
    if (scope.vendorId) {
      relationFilter.vendorId = scope.vendorId;
    }
    if (query.orderStatus) {
      relationFilter.status = {
        contains: query.orderStatus,
        mode: "insensitive",
      };
    }

    if (Object.keys(relationFilter).length > 0) {
      andConditions.push({ order: relationFilter });
    }

    if (query.status) {
      andConditions.push({
        status: { contains: query.status, mode: "insensitive" },
      });
    }

    if (query.paymentMethod) {
      andConditions.push({
        paymentMethod: { contains: query.paymentMethod, mode: "insensitive" },
      });
    }

    if (query.minAmount !== undefined || query.maxAmount !== undefined) {
      const amountFilter: Prisma.DecimalFilter = {};
      if (query.minAmount !== undefined) {
        amountFilter.gte = query.minAmount;
      }
      if (query.maxAmount !== undefined) {
        amountFilter.lte = query.maxAmount;
      }
      andConditions.push({ amount: amountFilter });
    }

    if (query.startDate || query.endDate) {
      const createdAtFilter: Prisma.DateTimeFilter = {};

      if (query.startDate) {
        const parsedStartDate = new Date(query.startDate);
        if (Number.isNaN(parsedStartDate.getTime())) {
          throw new BadRequestException("Invalid startDate");
        }
        createdAtFilter.gte = parsedStartDate;
      }

      if (query.endDate) {
        const parsedEndDate = new Date(query.endDate);
        if (Number.isNaN(parsedEndDate.getTime())) {
          throw new BadRequestException("Invalid endDate");
        }
        createdAtFilter.lte = parsedEndDate;
      }

      andConditions.push({ createdAt: createdAtFilter });
    }

    if (query.search) {
      andConditions.push({
        OR: [
          {
            stripePaymentId: {
              contains: query.search,
              mode: "insensitive",
            },
          },
          {
            status: {
              contains: query.search,
              mode: "insensitive",
            },
          },
          {
            paymentMethod: {
              contains: query.search,
              mode: "insensitive",
            },
          },
          {
            cardBrand: {
              contains: query.search,
              mode: "insensitive",
            },
          },
          {
            order: {
              orderNumber: {
                contains: query.search,
                mode: "insensitive",
              },
            },
          },
          {
            order: {
              buyer: {
                OR: [
                  {
                    fullName: {
                      contains: query.search,
                      mode: "insensitive",
                    },
                  },
                  {
                    phone: {
                      contains: query.search,
                      mode: "insensitive",
                    },
                  },
                  {
                    user: {
                      email: {
                        contains: query.search,
                        mode: "insensitive",
                      },
                    },
                  },
                ],
              },
            },
          },
          {
            order: {
              vendor: {
                OR: [
                  {
                    fullName: {
                      contains: query.search,
                      mode: "insensitive",
                    },
                  },
                  {
                    storename: {
                      contains: query.search,
                      mode: "insensitive",
                    },
                  },
                  {
                    businessName: {
                      contains: query.search,
                      mode: "insensitive",
                    },
                  },
                  {
                    vendorCode: {
                      contains: query.search,
                      mode: "insensitive",
                    },
                  },
                ],
              },
            },
          },
        ],
      });
    }

    if (andConditions.length === 0) {
      return {};
    }

    return { AND: andConditions };
  }

  private async getPaginatedTransactions(
    where: Prisma.PaymentWhereInput,
    query: TransactionHistoryQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const orderBy = this.buildOrderBy(query.sortBy, query.sortOrder);

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              createdAt: true,
              subtotal: true,
              discountAmount: true,
              totalAmount: true,
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
                  storename: true,
                  businessName: true,
                  vendorCode: true,
                  user: {
                    select: {
                      id: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    const items = payments.map((payment) => ({
      id: payment.id,
      stripePaymentId: payment.stripePaymentId,
      stripeCustomerId: payment.stripeCustomerId,
      amount: Number(payment.amount),
      adminCommissionAmount: Number(payment.adminCommissionAmount),
      vendorPayoutAmount: Number(payment.vendorPayoutAmount),
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      cardBrand: payment.cardBrand,
      lastFourDigits: payment.lastFourDigits,
      expiresAt: payment.expiresAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      order: {
        ...payment.order,
        subtotal: Number(payment.order.subtotal),
        discountAmount: Number(payment.order.discountAmount),
        totalAmount: Number(payment.order.totalAmount),
      },
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  private buildOrderBy(
    sortBy: TransactionSortBy = TransactionSortBy.CREATED_AT,
    sortOrder: "asc" | "desc" = "desc",
  ): Prisma.PaymentOrderByWithRelationInput {
    switch (sortBy) {
      case TransactionSortBy.AMOUNT:
        return { amount: sortOrder };
      case TransactionSortBy.STATUS:
        return { status: sortOrder };
      case TransactionSortBy.ORDER_NUMBER:
        return { order: { orderNumber: sortOrder } };
      case TransactionSortBy.CREATED_AT:
      default:
        return { createdAt: sortOrder };
    }
  }
}
