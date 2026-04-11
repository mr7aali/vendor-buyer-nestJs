import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCouponDto } from "./dto/create-coupon.dto";
import { AssignCouponDto } from "./dto/assign-coupon.dto";

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  private generateCouponCode(discountType: string, discountValue: number) {
    const typePrefix = discountType === "percentage" ? "PCT" : "FIX";
    const normalizedValue = Number(discountValue);
    const valuePart = Number.isInteger(normalizedValue)
      ? normalizedValue.toString()
      : normalizedValue.toString().replace(".", "");
    const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();

    return `${typePrefix}${valuePart}${randomPart}`;
  }

  async create(vendorId: string, createCouponDto: CreateCouponDto) {
    let code = "";
    let existingCoupon: Awaited<
      ReturnType<typeof this.prisma.coupon.findUnique>
    > = null;
    let attempts = 0;

    do {
      code = this.generateCouponCode(
        createCouponDto.discountType,
        createCouponDto.discountValue,
      );

      existingCoupon = await this.prisma.coupon.findUnique({
        where: {
          vendorId_code: {
            vendorId,
            code,
          },
        },
      });

      attempts += 1;
    } while (existingCoupon && attempts < 5);

    if (existingCoupon) {
      throw new BadRequestException("Could not generate a unique coupon code");
    }

    return this.prisma.coupon.create({
      data: {
        ...createCouponDto,
        vendorId,
        code,
        discountValue: createCouponDto.discountValue,
        validFrom: new Date(createCouponDto.validFrom),
        validUntil: new Date(createCouponDto.validUntil),
      },
    });
  }

  async findAllByVendor(vendorId: string) {
    return this.prisma.coupon.findMany({
      where: { vendorId },
      include: {
        _count: {
          select: { buyerAssignments: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, vendorId: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: {
        buyerAssignments: {
          include: {
            buyer: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    // fullName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!coupon) {
      throw new NotFoundException("Coupon not found");
    }

    if (coupon.vendorId !== vendorId) {
      throw new ForbiddenException("You do not have access to this coupon");
    }

    return coupon;
  }

  async assignToBuyer(
    couponId: string,
    vendorId: string,
    assignCouponDto: AssignCouponDto,
  ) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      throw new NotFoundException("Coupon not found");
    }

    if (coupon.vendorId !== vendorId) {
      throw new ForbiddenException("You do not have access to this coupon");
    }

    // Check if already assigned
    const existingAssignment =
      await this.prisma.couponBuyerAssignment.findUnique({
        where: {
          couponId_buyerId: {
            couponId,
            buyerId: assignCouponDto.buyerId,
          },
        },
      });

    if (existingAssignment) {
      throw new BadRequestException("Coupon already assigned to this buyer");
    }

    // Verify buyer is connected to vendor
    const connection = await this.prisma.vendorBuyerConnection.findUnique({
      where: {
        vendorId_buyerId: {
          vendorId,
          buyerId: assignCouponDto.buyerId,
        },
      },
    });

    if (!connection || !connection.isActive) {
      throw new ForbiddenException("Buyer is not connected to this vendor");
    }

    return this.prisma.couponBuyerAssignment.create({
      data: {
        couponId,
        buyerId: assignCouponDto.buyerId,
      },
      include: {
        buyer: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                // fullName: true,
              },
            },
          },
        },
      },
    });
  }

  async getBuyerCoupons(buyerId: string, vendorId?: string) {
    const where: any = {
      buyerId,
      isUsed: false,
      coupon: {
        isActive: true,
        validFrom: { lte: new Date() },
        validUntil: { gte: new Date() },
      },
    };

    if (vendorId) {
      where.coupon = {
        ...where.coupon,
        vendorId,
      };
    }

    return this.prisma.couponBuyerAssignment.findMany({
      where,
      include: {
        coupon: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async update(
    id: string,
    vendorId: string,
    updateDto: Partial<CreateCouponDto>,
  ) {
    const coupon = await this.findOne(id, vendorId);

    const updateData: any = {};
    if (updateDto.discountType)
      updateData.discountType = updateDto.discountType;
    if (updateDto.discountValue !== undefined)
      updateData.discountValue = updateDto.discountValue;
    if (updateDto.minPurchaseAmount !== undefined)
      updateData.minPurchaseAmount = updateDto.minPurchaseAmount;
    if (updateDto.usageLimit !== undefined)
      updateData.usageLimit = updateDto.usageLimit;
    if (updateDto.validFrom)
      updateData.validFrom = new Date(updateDto.validFrom);
    if (updateDto.validUntil)
      updateData.validUntil = new Date(updateDto.validUntil);

    return this.prisma.coupon.update({
      where: { id },
      data: updateData,
    });
  }

  async deactivate(id: string, vendorId: string) {
    await this.findOne(id, vendorId);
    return this.prisma.coupon.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
