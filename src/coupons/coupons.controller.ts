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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { AssignCouponDto } from './dto/assign-coupon.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserType } from '../auth/dto/register.dto';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Coupons')
@ApiBearerAuth('JWT-auth')
@Controller('coupons')
@UseGuards(JwtAuthGuard)
export class CouponsController {
  constructor(
    private readonly couponsService: CouponsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Roles(UserType.VENDOR)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a coupon', description: 'Vendor only: Create a new discount coupon' })
  @ApiResponse({ status: 201, description: 'Coupon created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid coupon data or unique code generation failed' })
  @ApiResponse({ status: 403, description: 'Forbidden - Vendor access required' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @ApiBody({ type: CreateCouponDto })
  async create(@Body() createCouponDto: CreateCouponDto, @GetUser() user: any) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }
    return this.couponsService.create(vendor.id, createCouponDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get coupons', description: 'Get coupons - Vendors see their coupons, Buyers see coupons assigned to them (optionally filtered by vendor)' })
  @ApiQuery({ name: 'vendorId', required: false, description: 'Filter coupons by vendor ID (buyer only)', example: 'uuid-here' })
  @ApiResponse({ status: 200, description: 'Coupons retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Buyer or vendor profile not found' })
  async findAll(@GetUser() user: any, @Query('vendorId') vendorId?: string) {
    if (user.userType === 'vendor') {
      const vendor = await this.prisma.vendor.findUnique({
        where: { userId: user.id },
      });
      if (!vendor) {
        throw new NotFoundException('Vendor profile not found');
      }
      return this.couponsService.findAllByVendor(vendor.id);
    } else if (user.userType === 'buyer') {
      const buyer = await this.prisma.buyer.findUnique({
        where: { userId: user.id },
      });
      if (!buyer) {
        throw new NotFoundException('Buyer profile not found');
      }
      return this.couponsService.getBuyerCoupons(buyer.id, vendorId);
    }
  }

  @Get(':id')
  @Roles(UserType.VENDOR)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get coupon by ID', description: 'Vendor only: Get a specific coupon with details' })
  @ApiParam({ name: 'id', description: 'Coupon ID', example: 'uuid-here' })
  @ApiResponse({ status: 200, description: 'Coupon retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Vendor access required or coupon does not belong to vendor' })
  @ApiResponse({ status: 404, description: 'Coupon or vendor not found' })
  async findOne(@Param('id') id: string, @GetUser() user: any) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }
    return this.couponsService.findOne(id, vendor.id);
  }

  @Post(':id/assign')
  @Roles(UserType.VENDOR)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign coupon to buyer', description: 'Vendor only: Assign a coupon to a specific buyer. Buyer must be connected to vendor.' })
  @ApiParam({ name: 'id', description: 'Coupon ID', example: 'uuid-here' })
  @ApiResponse({ status: 201, description: 'Coupon assigned successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Coupon already assigned or buyer not connected' })
  @ApiResponse({ status: 403, description: 'Forbidden - Vendor access required or coupon does not belong to vendor' })
  @ApiResponse({ status: 404, description: 'Coupon, vendor, or buyer not found' })
  @ApiBody({ type: AssignCouponDto })
  async assignToBuyer(
    @Param('id') id: string,
    @Body() assignCouponDto: AssignCouponDto,
    @GetUser() user: any,
  ) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }
    return this.couponsService.assignToBuyer(id, vendor.id, assignCouponDto);
  }

  @Patch(':id/deactivate')
  @Roles(UserType.VENDOR)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Deactivate coupon', description: 'Vendor only: Deactivate a coupon to prevent further usage' })
  @ApiParam({ name: 'id', description: 'Coupon ID', example: 'uuid-here' })
  @ApiResponse({ status: 200, description: 'Coupon deactivated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Vendor access required or coupon does not belong to vendor' })
  @ApiResponse({ status: 404, description: 'Coupon or vendor not found' })
  async deactivate(@Param('id') id: string, @GetUser() user: any) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }
    return this.couponsService.deactivate(id, vendor.id);
  }
}
