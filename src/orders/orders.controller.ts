import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  NotFoundException,
  HttpCode,
  HttpStatus,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from "@nestjs/swagger";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { GetOrdersFilterDto } from "./dto/get-orders-filter.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { UserType } from "../auth/dto/register.dto";
import { PrismaService } from "../prisma/prisma.service";
import { AdminAuthGuard } from "src/auth/guards/admin-auth.guard";

@ApiTags("Orders")
@ApiBearerAuth("JWT-auth")
@Controller("orders")
// @UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Roles(UserType.BUYER)
  // @UseGuards(RolesGuard)
  @UseGuards(JwtAuthGuard, RolesGuard) // Authentication guard MUST come first
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create an order",
    description:
      "Buyer only: Create an order from cart items for a specific vendor. Cart must contain items from the vendor.",
  })
  @ApiResponse({ status: 201, description: "Order created successfully" })
  @ApiResponse({
    status: 400,
    description: "Bad request - Cart is empty or insufficient stock",
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - Buyer not connected to vendor or buyer access required",
  })
  @ApiResponse({ status: 404, description: "Buyer not found" })
  @ApiBody({ type: CreateOrderDto })
  async create(@Body() createOrderDto: CreateOrderDto, @GetUser() user: any) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { userId: user.id },
    });
    if (!buyer) {
      throw new NotFoundException("Buyer profile not found");
    }
    return this.ordersService.create(buyer.id, createOrderDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard) // ✅ ADD THIS
  @ApiOperation({
    summary: "Get all orders",
    description:
      "Get all orders - Buyers see their orders, Vendors see orders for their products",
  })
  @ApiResponse({ status: 200, description: "Orders retrieved successfully" })
  @ApiResponse({
    status: 404,
    description: "Buyer or vendor profile not found",
  })
  async findAll(@GetUser() user: any) {
    console.log(user, "This is order req.");
    if (user.userType === "buyer") {
      const buyer = await this.prisma.buyer.findUnique({
        where: { userId: user.id },
      });
      if (!buyer) {
        throw new NotFoundException("Buyer profile not found");
      }
      return this.ordersService.findAllByBuyer(buyer.id);
    } else if (user.userType === "vendor") {
      const vendor = await this.prisma.vendor.findUnique({
        where: { userId: user.id },
      });
      if (!vendor) {
        throw new NotFoundException("Vendor profile not found");
      }
      return this.ordersService.findAllByVendor(vendor.id);
    }
  }

  @Get("get-all")
  @UseGuards(AdminAuthGuard)
  @ApiOperation({
    summary: "Get all orders for admin",
    description: "Get all orders with filtering, searching, and pagination",
  })
  async findAllForAdmin(@Query() filterDto: GetOrdersFilterDto) {
    return this.ordersService.findAllForAdmin(filterDto);
  }

  @Get("admin-order-details/:id")
  @UseGuards(AdminAuthGuard)
  @ApiOperation({
    summary: "Get order details for admin",
    description: "Get a specific order with full details for admin view",
  })
  @ApiParam({ name: "id", description: "Order ID", example: "uuid-here" })
  async orderDetailsForAdmin(@Param("id") id: string) {
    return this.ordersService.orderDetailsForAdmin(id);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Get order by ID",
    description:
      "Get a specific order with all details. Buyers can only see their orders, vendors can only see orders for their products.",
  })
  @ApiParam({ name: "id", description: "Order ID", example: "uuid-here" })
  @ApiResponse({ status: 200, description: "Order retrieved successfully" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - No access to this order",
  })
  @ApiResponse({ status: 404, description: "Order not found" })
  async findOne(@Param("id") id: string, @GetUser() user: any) {
    console.log(user, "user ");
    return this.ordersService.findOne(id, user.id, user.userType);
  }

  @Patch(":id/status")
  @Roles(UserType.VENDOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: "Update order status",
    description:
      "Vendor only: Update the status of an order (pending, processing, shipped, delivered, cancelled)",
  })
  @ApiParam({ name: "id", description: "Order ID", example: "uuid-here" })
  @ApiResponse({
    status: 200,
    description: "Order status updated successfully",
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - Vendor access required or order does not belong to vendor",
  })
  @ApiResponse({ status: 404, description: "Order or vendor not found" })
  @ApiBody({ type: UpdateOrderStatusDto })
  async updateStatus(
    @Param("id") id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    @GetUser() user: any,
  ) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
    });
    if (!vendor) {
      throw new NotFoundException("Vendor profile not found");
    }
    return this.ordersService.updateStatus(id, vendor.id, updateOrderStatusDto);
  }
}
