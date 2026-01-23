import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { CloudinaryService } from "src/cloudinary/cloudinary.service";

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // async create(vendorId: string, createProductDto: CreateProductDto) {
  //   // Verify category belongs to vendor
  //   const category = await this.prisma.category.findUnique({
  //     where: { id: createProductDto.categoryId },
  //   });

  //   if (!category) {
  //     throw new NotFoundException("Category not found");
  //   }

  //   if (category.vendorId !== vendorId) {
  //     throw new ForbiddenException("Category does not belong to this vendor");
  //   }

  //   return this.prisma.product.create({
  //     data: {
  //       ...createProductDto,
  //       vendorId,
  //       price: createProductDto.price,
  //       stockQuantity: createProductDto.stockQuantity,
  //       images: [], // image fields
  //     },
  //     include: {
  //       category: true,
  //       vendor: {
  //         select: {
  //           id: true,
  //           businessName: true,
  //         },
  //       },
  //     },
  //   });
  // }

  async create({
    vendorId,
    createProductDto,
    files,
  }: {
    vendorId: string;
    createProductDto: CreateProductDto;
    files: {
      images?: Express.Multer.File[];
    };
  }) {
    // Validate that at least one image is provided
    if (!files?.images || files.images.length === 0) {
      throw new BadRequestException("At least one product image is required");
    }

    // Optional: Limit maximum number of images
    const MAX_IMAGES = 10;
    if (files.images.length > MAX_IMAGES) {
      throw new BadRequestException(
        `Maximum ${MAX_IMAGES} images allowed per product`,
      );
    }

    // Verify category belongs to vendor
    const category = await this.prisma.category.findUnique({
      where: { id: createProductDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException("Category not found");
    }

    if (category.vendorId !== vendorId) {
      throw new ForbiddenException("Category does not belong to this vendor");
    }

    try {
      // Upload all images to Cloudinary in parallel
      const uploadPromises = files.images.map((file) =>
        this.cloudinaryService.uploadFile(file, "products"),
      );

      const uploadResults = await Promise.all(uploadPromises);

      // Extract secure URLs from upload results
      const imageUrls = uploadResults.map((result) => result.secure_url);

      // Create product with uploaded image URLs
      const product = await this.prisma.product.create({
        data: {
          ...createProductDto,
          vendorId,
          price: createProductDto.price,
          stockQuantity: createProductDto.stockQuantity,
          images: imageUrls,
        },
        include: {
          category: true,
          vendor: {
            select: {
              id: true,
              businessName: true,
            },
          },
        },
      });

      return {
        message: "Product created successfully",
        product,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to create product: ${error.message}`,
      );
    }
  }

  async findAllByVendor(vendorId: string) {
    return this.prisma.product.findMany({
      where: { vendorId },
      include: {
        category: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findAllByCategory(categoryId: string, vendorId: string) {
    return this.prisma.product.findMany({
      where: {
        categoryId,
        vendorId,
        isAvailable: true,
      },
      include: {
        category: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        vendor: {
          select: {
            id: true,
            businessName: true,
            vendorCode: true,
          },
        },
      },
    });
  }

  async update(
    id: string,
    vendorId: string,
    updateProductDto: UpdateProductDto,
  ) {
    const product = await this.findOne(id);

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    if (product.vendorId !== vendorId) {
      throw new ForbiddenException("You do not have access to this product");
    }

    if (
      updateProductDto.categoryId &&
      updateProductDto.categoryId !== product.categoryId
    ) {
      const category = await this.prisma.category.findUnique({
        where: { id: updateProductDto.categoryId },
      });

      if (!category || category.vendorId !== vendorId) {
        throw new BadRequestException("Invalid category");
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
      include: {
        category: true,
      },
    });
  }

  async remove(id: string, vendorId: string) {
    const product = await this.findOne(id);

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    if (product.vendorId !== vendorId) {
      throw new ForbiddenException("You do not have access to this product");
    }

    return this.prisma.product.delete({
      where: { id },
    });
  }

  async getProductsForBuyer(buyerId: string, vendorId: string) {
    // Check connection
    const connection = await this.prisma.vendorBuyerConnection.findUnique({
      where: {
        vendorId_buyerId: {
          vendorId,
          buyerId,
        },
      },
    });

    if (!connection || !connection.isActive) {
      throw new ForbiddenException("You are not connected to this vendor");
    }

    return this.prisma.product.findMany({
      where: {
        vendorId,
        isAvailable: true,
      },
      include: {
        category: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getProductsByCategoryForBuyer(
    buyerId: string,
    vendorId: string,
    categoryId: string,
  ) {
    await this.getProductsForBuyer(buyerId, vendorId);
    return this.findAllByCategory(categoryId, vendorId);
  }
}
