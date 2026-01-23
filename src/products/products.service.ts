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
    const product = await this.prisma.product.findUnique({
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

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    return product;
  }

  async update({
    id,
    vendorId,
    updateProductDto,
    files,
  }: {
    id: string;
    vendorId: string;
    updateProductDto: UpdateProductDto;
    files?: {
      images?: Express.Multer.File[];
    };
  }) {
    // Find and verify ownership
    const product = await this.findOne(id);

    if (product.vendorId !== vendorId) {
      throw new ForbiddenException("You do not have access to this product");
    }

    // If category is being updated, verify it belongs to vendor
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

    let newImageUrls: string[] | undefined;

    // If new images are uploaded
    if (files?.images && files.images.length > 0) {
      const MAX_IMAGES = 10;
      if (files.images.length > MAX_IMAGES) {
        throw new BadRequestException(
          `Maximum ${MAX_IMAGES} images allowed per product`,
        );
      }

      try {
        // Upload new images to Cloudinary
        const uploadPromises = files.images.map((file) =>
          this.cloudinaryService.uploadFile(file, "products"),
        );

        const uploadResults = await Promise.all(uploadPromises);
        newImageUrls = uploadResults.map((result) => result.secure_url);

        // Delete old images from Cloudinary
        if (product.images && product.images.length > 0) {
          const deletePromises = product.images.map((imageUrl) =>
            this.cloudinaryService.deleteFileByUrl(imageUrl).catch((error) => {
              console.error("Failed to delete old image:", error);
              // Don't fail the update if old image deletion fails
            }),
          );

          await Promise.allSettled(deletePromises);
        }
      } catch (error) {
        throw new BadRequestException(
          `Failed to upload new images: ${error.message}`,
        );
      }
    }

    // Update product in database
    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        ...updateProductDto,
        ...(newImageUrls && { images: newImageUrls }),
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
      message: "Product updated successfully",
      product: updatedProduct,
    };
  }

  async remove(id: string, vendorId: string) {
    // Find and verify ownership
    const product = await this.findOne(id);

    if (product.vendorId !== vendorId) {
      throw new ForbiddenException("You do not have access to this product");
    }

    try {
      // Delete all images from Cloudinary
      if (product.images && product.images.length > 0) {
        const deletePromises = product.images.map((imageUrl) =>
          this.cloudinaryService.deleteFileByUrl(imageUrl),
        );

        await Promise.allSettled(deletePromises);
      }

      // Delete product from database
      const deletedProduct = await this.prisma.product.delete({
        where: { id },
      });

      return {
        message: "Product deleted successfully",
        product: deletedProduct,
      };
    } catch (error) {
      // If Cloudinary deletion fails, log error but continue with database deletion
      if (error.message?.includes("Cloudinary")) {
        console.error("Cloudinary deletion failed:", error);

        const deletedProduct = await this.prisma.product.delete({
          where: { id },
        });

        return {
          message:
            "Product deleted successfully, but some images may still exist in Cloudinary",
          product: deletedProduct,
          warning: "Some images may not have been deleted from Cloudinary",
        };
      }

      throw new BadRequestException(
        `Failed to delete product: ${error.message}`,
      );
    }
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
