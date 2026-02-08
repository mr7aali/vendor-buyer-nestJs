import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateProductDto,
  CreateSpecificatonDto,
} from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { CloudinaryService } from "src/cloudinary/cloudinary.service";
import { randomUUID } from "crypto";

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private normalize(text: string, length: number) {
    return text
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, length)
      .toUpperCase();
  }

  private async generateUniqueSKU(
    vendorName: string,
    categoryName: string,
    productName: string,
  ) {
    while (true) {
      const vendorPart = this.normalize(vendorName, 2);
      const categoryPart = this.normalize(categoryName, 2);
      const productPart = this.normalize(productName, 2);
      const uniquePart = randomUUID().substring(0, 4).toUpperCase();

      const sku = `${vendorPart}${categoryPart}${productPart}-${uniquePart}`;

      const exists = await this.prisma.product.findUnique({
        where: { sku },
      });

      if (!exists) return sku;
    }
  }

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
      include: {
        vendor: true,
      },
    });

    if (!category) {
      throw new NotFoundException("Category not found");
    }
    console.log(category.vendor.fullName);
    if (category.vendorId !== vendorId) {
      throw new ForbiddenException("Category does not belong to this vendor");
    }
    const sku = await this.generateUniqueSKU(
      category.vendor.fullName,
      category.name,
      createProductDto.name,
    );

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
          sku: sku, //it will be generate by using catagory and verndor name
          minimulAuantity: createProductDto.minimulAuantity,
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
  async specificationCreate(dto: CreateSpecificatonDto, vendorId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true, vendorId: true },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    if (product.vendorId !== vendorId) {
      throw new ForbiddenException(
        "You are not allowed to add specification to this product",
      );
    }

    return this.prisma.specification.create({
      data: {
        label: dto.label,
        value: dto.value,
        productId: dto.productId,
      },
    });
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
  async getAllProductForTest() {
    return this.prisma.product.findMany({
      include: { category: true, _count: true },
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
