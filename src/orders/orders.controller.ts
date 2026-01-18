import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserType } from '../auth/dto/register.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Roles(UserType.BUYER)
  @UseGuards(RolesGuard)
  async create(@Body() createOrderDto: CreateOrderDto, @GetUser() user: any) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { userId: user.id },
    });
    if (!buyer) {
      throw new NotFoundException('Buyer profile not found');
    }
    return this.ordersService.create(buyer.id, createOrderDto);
  }

  @Get()
  async findAll(@GetUser() user: any) {
    if (user.userType === 'buyer') {
      const buyer = await this.prisma.buyer.findUnique({
        where: { userId: user.id },
      });
      if (!buyer) {
        throw new NotFoundException('Buyer profile not found');
      }
      return this.ordersService.findAllByBuyer(buyer.id);
    } else if (user.userType === 'vendor') {
      const vendor = await this.prisma.vendor.findUnique({
        where: { userId: user.id },
      });
      if (!vendor) {
        throw new NotFoundException('Vendor profile not found');
      }
      return this.ordersService.findAllByVendor(vendor.id);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetUser() user: any) {
    return this.ordersService.findOne(id, user.id, user.userType);
  }

  @Patch(':id/status')
  @Roles(UserType.VENDOR)
  @UseGuards(RolesGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    @GetUser() user: any,
  ) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }
    return this.ordersService.updateStatus(id, vendor.id, updateOrderStatusDto);
  }
}
