import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
// import { ReviewService } from "./review.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { GetUser } from "../auth/decorators/get-user.decorator";
import {
  CreateProductReviewDto,
  UpdateProductReviewDto,
  CreateVendorReviewDto,
  UpdateVendorReviewDto,
  GetReviewsQueryDto,
} from "./dto";
import { ReviewService } from "./review.service";

@Controller("reviews")
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  // ==================== PRODUCT REVIEWS ====================

  @Post("product")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createProductReview(
    @GetUser("id") buyerId: string,
    @Body() dto: CreateProductReviewDto,
  ) {
    return this.reviewService.createProductReview(buyerId, dto);
  }

  @Get("product/:productId")
  async getProductReviews(
    @Param("productId") productId: string,
    @Query() query: GetReviewsQueryDto,
  ) {
    return this.reviewService.getProductReviews(productId, query);
  }

  @Patch("product/:reviewId")
  @UseGuards(JwtAuthGuard)
  async updateProductReview(
    @Param("reviewId") reviewId: string,
    @GetUser("id") buyerId: string,
    @Body() dto: UpdateProductReviewDto,
  ) {
    return this.reviewService.updateProductReview(reviewId, buyerId, dto);
  }

  @Delete("product/:reviewId")
  @UseGuards(JwtAuthGuard)
  async deleteProductReview(
    @Param("reviewId") reviewId: string,
    @GetUser("id") buyerId: string,
  ) {
    return this.reviewService.deleteProductReview(reviewId, buyerId);
  }

  // ==================== VENDOR REVIEWS ====================

  @Post("vendor")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createVendorReview(
    @GetUser("id") buyerId: string,
    @Body() dto: CreateVendorReviewDto,
  ) {
    return this.reviewService.createVendorReview(buyerId, dto);
  }

  @Get("vendor/:vendorId")
  async getVendorReviews(
    @Param("vendorId") vendorId: string,
    @Query() query: GetReviewsQueryDto,
  ) {
    return this.reviewService.getVendorReviews(vendorId, query);
  }

  @Patch("vendor/:reviewId")
  @UseGuards(JwtAuthGuard)
  async updateVendorReview(
    @Param("reviewId") reviewId: string,
    @GetUser("id") buyerId: string,
    @Body() dto: UpdateVendorReviewDto,
  ) {
    return this.reviewService.updateVendorReview(reviewId, buyerId, dto);
  }

  @Delete("vendor/:reviewId")
  @UseGuards(JwtAuthGuard)
  async deleteVendorReview(
    @Param("reviewId") reviewId: string,
    @GetUser("id") buyerId: string,
  ) {
    return this.reviewService.deleteVendorReview(reviewId, buyerId);
  }

  // ==================== BUYER'S REVIEWS ====================

  @Get("buyer/products")
  @UseGuards(JwtAuthGuard)
  async getBuyerProductReviews(
    @GetUser("id") buyerId: string,
    @Query() query: GetReviewsQueryDto,
  ) {
    return this.reviewService.getBuyerProductReviews(buyerId, query);
  }

  @Get("buyer/vendors")
  @UseGuards(JwtAuthGuard)
  async getBuyerVendorReviews(
    @GetUser("id") buyerId: string,
    @Query() query: GetReviewsQueryDto,
  ) {
    return this.reviewService.getBuyerVendorReviews(buyerId, query);
  }
}
