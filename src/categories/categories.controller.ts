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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserType } from '../auth/dto/register.dto';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Categories')
@ApiBearerAuth('JWT-auth')
@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Roles(UserType.VENDOR)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new category', description: 'Vendor only: Create a new category for organizing products' })
  @ApiResponse({ status: 201, description: 'Category successfully created' })
  @ApiResponse({ status: 403, description: 'Forbidden - Vendor access required' })
  @ApiResponse({ status: 404, description: 'Vendor profile not found' })
  @ApiBody({ type: CreateCategoryDto })
  async create(@Body() createCategoryDto: CreateCategoryDto, @GetUser() user: any) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }
    return this.categoriesService.create(vendor.id, createCategoryDto);
  }

  @Get('vendor/:vendorId')
  @ApiOperation({ summary: 'Get categories for a vendor', description: 'Get all categories for a specific vendor. Buyers can only see categories from connected vendors.' })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID', example: 'uuid-here' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Buyer not connected to vendor' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async findAllForVendor(@Param('vendorId') vendorId: string, @GetUser() user: any) {
    if (user.userType === 'vendor') {
      const vendor = await this.prisma.vendor.findUnique({
        where: { userId: user.id },
      });
      if (vendor?.id !== vendorId) {
        throw new NotFoundException('Vendor not found');
      }
      return this.categoriesService.findAllByVendor(vendorId);
    } else if (user.userType === 'buyer') {
      const buyer = await this.prisma.buyer.findUnique({
        where: { userId: user.id },
      });
      if (!buyer) {
        throw new NotFoundException('Buyer profile not found');
      }
      return this.categoriesService.getCategoriesForBuyer(buyer.id, vendorId);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID', description: 'Get a specific category with its details. Buyers can only access categories from connected vendors.' })
  @ApiParam({ name: 'id', description: 'Category ID', example: 'uuid-here' })
  @ApiResponse({ status: 200, description: 'Category retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - No access to this category' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findOne(@Param('id') id: string, @GetUser() user: any) {
    let vendorId: string;
    if (user.userType === 'vendor') {
      const vendor = await this.prisma.vendor.findUnique({
        where: { userId: user.id },
      });
      if (!vendor) {
        throw new NotFoundException('Vendor profile not found');
      }
      vendorId = vendor.id;
    } else {
      // For buyers, we need to get vendor from category
      const category = await this.prisma.category.findUnique({
        where: { id },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
      vendorId = category.vendorId;
      const buyer = await this.prisma.buyer.findUnique({
        where: { userId: user.id },
      });
      if (!buyer) {
        throw new NotFoundException('Buyer profile not found');
      }
      // Check connection
      await this.categoriesService.getCategoriesForBuyer(buyer.id, vendorId);
    }
    return this.categoriesService.findOne(id, vendorId);
  }

  @Patch(':id')
  @Roles(UserType.VENDOR)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update a category', description: 'Vendor only: Update category information' })
  @ApiParam({ name: 'id', description: 'Category ID', example: 'uuid-here' })
  @ApiResponse({ status: 200, description: 'Category successfully updated' })
  @ApiResponse({ status: 403, description: 'Forbidden - Vendor access required' })
  @ApiResponse({ status: 404, description: 'Category or vendor not found' })
  @ApiBody({ type: UpdateCategoryDto })
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @GetUser() user: any,
  ) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }
    return this.categoriesService.update(id, vendor.id, updateCategoryDto);
  }

  @Delete(':id')
  @Roles(UserType.VENDOR)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a category', description: 'Vendor only: Delete a category. Products in this category will remain but lose category association.' })
  @ApiParam({ name: 'id', description: 'Category ID', example: 'uuid-here' })
  @ApiResponse({ status: 200, description: 'Category successfully deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden - Vendor access required' })
  @ApiResponse({ status: 404, description: 'Category or vendor not found' })
  async remove(@Param('id') id: string, @GetUser() user: any) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }
    return this.categoriesService.remove(id, vendor.id);
  }
}
