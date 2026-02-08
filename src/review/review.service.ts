import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateProductReviewDto,
  UpdateProductReviewDto,
  CreateVendorReviewDto,
  UpdateVendorReviewDto,
  GetReviewsQueryDto,
  ReviewSortBy,
} from "./dto";

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  // ==================== PRODUCT REVIEWS ====================

  async createProductReview(buyerId: string, dto: CreateProductReviewDto) {
    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    // Check if buyer has purchased this product (if orderId provided)
    let isVerifiedPurchase = false;
    if (dto.orderId) {
      const order = await this.prisma.order.findFirst({
        where: {
          id: dto.orderId,
          buyerId,
          status: "DELIVERED",
          items: {
            some: {
              productId: dto.productId,
            },
          },
        },
      });

      if (!order) {
        throw new BadRequestException(
          "Order not found or not eligible for review",
        );
      }

      isVerifiedPurchase = true;

      // Check if already reviewed
      const existingReview = await this.prisma.productReview.findUnique({
        where: {
          productId_buyerId_orderId: {
            productId: dto.productId,
            buyerId,
            orderId: dto.orderId,
          },
        },
      });

      if (existingReview) {
        throw new BadRequestException(
          "You have already reviewed this product for this order",
        );
      }
    }

    // Create review
    const review = await this.prisma.productReview.create({
      data: {
        productId: dto.productId,
        buyerId,
        orderId: dto.orderId,
        rating: dto.rating,
        comment: dto.comment,
        isVerifiedPurchase,
      },
      include: {
        buyer: {
          select: {
            id: true,
            fullName: true,
            profilePhotoUrl: true,
          },
        },
      },
    });

    // Update product average rating
    await this.updateProductRating(dto.productId);

    return {
      success: true,
      message: "Review created successfully",
      review,
    };
  }

  async getProductReviews(productId: string, query: GetReviewsQueryDto) {
    const {
      page = 1,
      limit = 10,
      rating,
      search,
      sortBy,
      verifiedOnly,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = { productId };

    if (rating) {
      where.rating = rating;
    }

    if (search) {
      where.comment = { contains: search, mode: "insensitive" };
    }

    if (verifiedOnly === "true") {
      where.isVerifiedPurchase = true;
    }

    let orderBy: any = { createdAt: "desc" };

    switch (sortBy) {
      case ReviewSortBy.RATING_HIGH:
        orderBy = { rating: "desc" };
        break;
      case ReviewSortBy.RATING_LOW:
        orderBy = { rating: "asc" };
        break;
      default:
        orderBy = { createdAt: "desc" };
    }

    const [reviews, total, ratingDistribution] = await Promise.all([
      this.prisma.productReview.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          buyer: {
            select: {
              id: true,
              fullName: true,
              profilePhotoUrl: true,
            },
          },
        },
      }),
      this.prisma.productReview.count({ where }),
      this.prisma.productReview.groupBy({
        by: ["rating"],
        where: { productId },
        _count: true,
      }),
    ]);

    // Calculate rating distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingDistribution.forEach((r) => {
      distribution[r.rating] = r._count;
    });

    return {
      reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      ratingDistribution: distribution,
    };
  }

  async updateProductReview(
    reviewId: string,
    buyerId: string,
    dto: UpdateProductReviewDto,
  ) {
    const review = await this.prisma.productReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException("Review not found");
    }

    if (review.buyerId !== buyerId) {
      throw new ForbiddenException("You can only update your own reviews");
    }

    const updatedReview = await this.prisma.productReview.update({
      where: { id: reviewId },
      data: dto,
      include: {
        buyer: {
          select: {
            id: true,
            fullName: true,
            profilePhotoUrl: true,
          },
        },
      },
    });

    // Update product rating if rating changed
    if (dto.rating) {
      await this.updateProductRating(review.productId);
    }

    return {
      success: true,
      message: "Review updated successfully",
      review: updatedReview,
    };
  }

  async deleteProductReview(reviewId: string, buyerId: string) {
    const review = await this.prisma.productReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException("Review not found");
    }

    if (review.buyerId !== buyerId) {
      throw new ForbiddenException("You can only delete your own reviews");
    }

    await this.prisma.productReview.delete({
      where: { id: reviewId },
    });

    // Update product rating
    await this.updateProductRating(review.productId);

    return {
      success: true,
      message: "Review deleted successfully",
    };
  }

  // ==================== VENDOR REVIEWS ====================

  async createVendorReview(buyerId: string, dto: CreateVendorReviewDto) {
    // Check if vendor exists
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: dto.vendorId },
    });

    if (!vendor) {
      throw new NotFoundException("Vendor not found");
    }

    let isVerifiedPurchase = false;
    if (dto.orderId) {
      const order = await this.prisma.order.findFirst({
        where: {
          id: dto.orderId,
          buyerId,
          vendorId: dto.vendorId,
          status: "DELIVERED",
        },
      });

      if (!order) {
        throw new BadRequestException(
          "Order not found or not eligible for review",
        );
      }

      isVerifiedPurchase = true;

      // Check if already reviewed
      const existingReview = await this.prisma.vendorReview.findUnique({
        where: {
          vendorId_buyerId_orderId: {
            vendorId: dto.vendorId,
            buyerId,
            orderId: dto.orderId,
          },
        },
      });

      if (existingReview) {
        throw new BadRequestException(
          "You have already reviewed this vendor for this order",
        );
      }
    }

    const review = await this.prisma.vendorReview.create({
      data: {
        vendorId: dto.vendorId,
        buyerId,
        orderId: dto.orderId,
        rating: dto.rating,
        comment: dto.comment,
        isVerifiedPurchase,
      },
      include: {
        buyer: {
          select: {
            id: true,
            fullName: true,
            profilePhotoUrl: true,
          },
        },
      },
    });

    // Update vendor average rating
    await this.updateVendorRating(dto.vendorId);

    return {
      success: true,
      message: "Vendor review created successfully",
      review,
    };
  }

  async getVendorReviews(vendorId: string, query: GetReviewsQueryDto) {
    const {
      page = 1,
      limit = 10,
      rating,
      search,
      sortBy,
      verifiedOnly,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = { vendorId };

    if (rating) {
      where.rating = rating;
    }

    if (search) {
      where.comment = { contains: search, mode: "insensitive" };
    }

    if (verifiedOnly === "true") {
      where.isVerifiedPurchase = true;
    }

    let orderBy: any = { createdAt: "desc" };

    switch (sortBy) {
      case ReviewSortBy.RATING_HIGH:
        orderBy = { rating: "desc" };
        break;
      case ReviewSortBy.RATING_LOW:
        orderBy = { rating: "asc" };
        break;
      default:
        orderBy = { createdAt: "desc" };
    }

    const [reviews, total, ratingDistribution] = await Promise.all([
      this.prisma.vendorReview.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          buyer: {
            select: {
              id: true,
              fullName: true,
              profilePhotoUrl: true,
            },
          },
        },
      }),
      this.prisma.vendorReview.count({ where }),
      this.prisma.vendorReview.groupBy({
        by: ["rating"],
        where: { vendorId },
        _count: true,
      }),
    ]);

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingDistribution.forEach((r) => {
      distribution[r.rating] = r._count;
    });

    return {
      reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      ratingDistribution: distribution,
    };
  }

  async updateVendorReview(
    reviewId: string,
    buyerId: string,
    dto: UpdateVendorReviewDto,
  ) {
    const review = await this.prisma.vendorReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException("Review not found");
    }

    if (review.buyerId !== buyerId) {
      throw new ForbiddenException("You can only update your own reviews");
    }

    const updatedReview = await this.prisma.vendorReview.update({
      where: { id: reviewId },
      data: dto,
      include: {
        buyer: {
          select: {
            id: true,
            fullName: true,
            profilePhotoUrl: true,
          },
        },
      },
    });

    if (dto.rating) {
      await this.updateVendorRating(review.vendorId);
    }

    return {
      success: true,
      message: "Vendor review updated successfully",
      review: updatedReview,
    };
  }

  async deleteVendorReview(reviewId: string, buyerId: string) {
    const review = await this.prisma.vendorReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException("Review not found");
    }

    if (review.buyerId !== buyerId) {
      throw new ForbiddenException("You can only delete your own reviews");
    }

    await this.prisma.vendorReview.delete({
      where: { id: reviewId },
    });

    await this.updateVendorRating(review.vendorId);

    return {
      success: true,
      message: "Vendor review deleted successfully",
    };
  }

  // ==================== RATING CALCULATIONS ====================

  private async updateProductRating(productId: string) {
    const stats = await this.prisma.productReview.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: true,
    });

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        averageRating: stats._avg.rating || 0,
        totalReviews: stats._count,
      },
    });
  }

  private async updateVendorRating(vendorId: string) {
    const stats = await this.prisma.vendorReview.aggregate({
      where: { vendorId },
      _avg: { rating: true },
      _count: true,
    });

    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        averageRating: stats._avg.rating || 0,
        totalReviews: stats._count,
      },
    });
  }

  // ==================== GET BUYER'S REVIEWS ====================

  async getBuyerProductReviews(buyerId: string, query: GetReviewsQueryDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.productReview.findMany({
        where: { buyerId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
        },
      }),
      this.prisma.productReview.count({ where: { buyerId } }),
    ]);

    return {
      reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBuyerVendorReviews(buyerId: string, query: GetReviewsQueryDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.vendorReview.findMany({
        where: { buyerId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          vendor: {
            select: {
              id: true,
              fullName: true,
              storename: true,
              logoUrl: true,
            },
          },
        },
      }),
      this.prisma.vendorReview.count({ where: { buyerId } }),
    ]);

    return {
      reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
