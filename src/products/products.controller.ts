import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  NotFoundException,
  Query,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from "@nestjs/swagger";
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { UserType } from "../auth/dto/register.dto";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("Products")
@ApiBearerAuth("JWT-auth")
@Controller("products")
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Roles(UserType.VENDOR)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({ type: CreateProductDto })
  async create(
    @Body() createProductDto: CreateProductDto,
    @GetUser() user: any,
  ) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
    });
    if (!vendor) {
      throw new NotFoundException("Vendor profile not found");
    }
    return this.productsService.create(vendor.id, createProductDto);
  }

  @Get("vendor/:vendorId")
  @ApiOperation({
    summary: "Get products for a vendor",
    description:
      "Get all products for a vendor. Buyers can only see products from connected vendors. Optionally filter by category.",
  })
  @ApiParam({
    name: "vendorId",
    description: "Vendor ID",
    example: "uuid-here",
  })
  @ApiQuery({
    name: "categoryId",
    required: false,
    description: "Filter by category ID",
    example: "uuid-here",
  })
  @ApiResponse({ status: 200, description: "Products retrieved successfully" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Buyer not connected to vendor",
  })
  @ApiResponse({ status: 404, description: "Vendor or buyer not found" })
  async findAllForVendor(
    @Param("vendorId") vendorId: string,
    @GetUser() user: any,
    @Query("categoryId") categoryId?: string,
  ) {
    if (user.userType === "vendor") {
      const vendor = await this.prisma.vendor.findUnique({
        where: { userId: user.id },
      });
      if (vendor?.id !== vendorId) {
        throw new NotFoundException("Vendor not found");
      }
      if (categoryId) {
        return this.productsService.findAllByCategory(categoryId, vendorId);
      }
      return this.productsService.findAllByVendor(vendorId);
    } else if (user.userType === "buyer") {
      const buyer = await this.prisma.buyer.findUnique({
        where: { userId: user.id },
      });
      if (!buyer) {
        throw new NotFoundException("Buyer profile not found");
      }
      if (categoryId) {
        return this.productsService.getProductsByCategoryForBuyer(
          buyer.id,
          vendorId,
          categoryId,
        );
      }
      return this.productsService.getProductsForBuyer(buyer.id, vendorId);
    }
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get product by ID",
    description: "Get a specific product with its details",
  })
  @ApiParam({ name: "id", description: "Product ID", example: "uuid-here" })
  @ApiResponse({ status: 200, description: "Product retrieved successfully" })
  @ApiResponse({ status: 404, description: "Product not found" })
  async findOne(@Param("id") id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(":id")
  @Roles(UserType.VENDOR)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Update a product",
    description: "Vendor only: Update product information",
  })
  @ApiParam({ name: "id", description: "Product ID", example: "uuid-here" })
  @ApiResponse({ status: 200, description: "Product successfully updated" })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - Vendor access required or product does not belong to vendor",
  })
  @ApiResponse({ status: 404, description: "Product or vendor not found" })
  @ApiBody({ type: UpdateProductDto })
  async update(
    @Param("id") id: string,
    @Body() updateProductDto: UpdateProductDto,
    @GetUser() user: any,
  ) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
    });
    if (!vendor) {
      throw new NotFoundException("Vendor profile not found");
    }
    return this.productsService.update(id, vendor.id, updateProductDto);
  }

  @Delete(":id")
  @Roles(UserType.VENDOR)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Delete a product",
    description: "Vendor only: Delete a product",
  })
  @ApiParam({ name: "id", description: "Product ID", example: "uuid-here" })
  @ApiResponse({ status: 200, description: "Product successfully deleted" })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - Vendor access required or product does not belong to vendor",
  })
  @ApiResponse({ status: 404, description: "Product or vendor not found" })
  async remove(@Param("id") id: string, @GetUser() user: any) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
    });
    if (!vendor) {
      throw new NotFoundException("Vendor profile not found");
    }
    return this.productsService.remove(id, vendor.id);
  }
}
