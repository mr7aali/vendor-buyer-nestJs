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
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserType } from '../auth/dto/register.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Roles(UserType.VENDOR)
  @UseGuards(RolesGuard)
  async create(@Body() createProductDto: CreateProductDto, @GetUser() user: any) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }
    return this.productsService.create(vendor.id, createProductDto);
  }

  @Get('vendor/:vendorId')
  async findAllForVendor(
    @Param('vendorId') vendorId: string,
    @GetUser() user: any,
    @Query('categoryId') categoryId?: string,
  ) {
    if (user.userType === 'vendor') {
      const vendor = await this.prisma.vendor.findUnique({
        where: { userId: user.id },
      });
      if (vendor?.id !== vendorId) {
        throw new NotFoundException('Vendor not found');
      }
      if (categoryId) {
        return this.productsService.findAllByCategory(categoryId, vendorId);
      }
      return this.productsService.findAllByVendor(vendorId);
    } else if (user.userType === 'buyer') {
      const buyer = await this.prisma.buyer.findUnique({
        where: { userId: user.id },
      });
      if (!buyer) {
        throw new NotFoundException('Buyer profile not found');
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

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserType.VENDOR)
  @UseGuards(RolesGuard)
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @GetUser() user: any,
  ) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }
    return this.productsService.update(id, vendor.id, updateProductDto);
  }

  @Delete(':id')
  @Roles(UserType.VENDOR)
  @UseGuards(RolesGuard)
  async remove(@Param('id') id: string, @GetUser() user: any) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }
    return this.productsService.remove(id, vendor.id);
  }
}
