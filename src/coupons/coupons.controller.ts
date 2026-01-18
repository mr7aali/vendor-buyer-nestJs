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
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { AssignCouponDto } from './dto/assign-coupon.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserType } from '../auth/dto/register.dto';
import { PrismaService } from '../prisma/prisma.service';

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
