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
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from "@nestjs/swagger";
import { CartService } from "./cart.service";
import { AddToCartDto } from "./dto/add-to-cart.dto";
import { UpdateCartItemDto } from "./dto/update-cart-item.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { UserType } from "../auth/dto/register.dto";
import { PrismaService } from "../prisma/prisma.service";

// @Controller("cart")
// @UseGuards(JwtAuthGuard)
// @Roles(UserType.BUYER)
// @UseGuards(RolesGuard)
@Controller("cart")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.BUYER)
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getCart(@GetUser() user: any) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { userId: user.id },
    });
    if (!buyer) {
      throw new NotFoundException("Buyer profile not found");
    }
    return this.cartService.getCart(buyer.id);
  }

  @Post("add")
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({ type: AddToCartDto })
  async addToCart(@Body() addToCartDto: AddToCartDto, @GetUser() user: any) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { userId: user.id },
    });
    if (!buyer) {
      throw new NotFoundException("Buyer profile not found");
    }
    return this.cartService.addToCart(buyer.id, addToCartDto);
  }

  @Patch("items/:itemId")
  @ApiOperation({
    summary: "Update cart item quantity",
    description: "Buyer only: Update the quantity of an item in the cart",
  })
  @ApiParam({
    name: "itemId",
    description: "Cart item ID",
    example: "uuid-here",
  })
  @ApiResponse({ status: 200, description: "Cart item updated successfully" })
  @ApiResponse({ status: 400, description: "Bad request - Insufficient stock" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Buyer access required",
  })
  @ApiResponse({ status: 404, description: "Cart item or buyer not found" })
  @ApiBody({ type: UpdateCartItemDto })
  async updateCartItem(
    @Param("itemId") itemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
    @GetUser() user: any,
  ) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { userId: user.id },
    });
    if (!buyer) {
      throw new NotFoundException("Buyer profile not found");
    }
    return this.cartService.updateCartItem(buyer.id, itemId, updateCartItemDto);
  }

  @Delete("items/:itemId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Remove item from cart",
    description: "Buyer only: Remove an item from the cart",
  })
  @ApiParam({
    name: "itemId",
    description: "Cart item ID",
    example: "uuid-here",
  })
  @ApiResponse({
    status: 200,
    description: "Item removed from cart successfully",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Buyer access required",
  })
  @ApiResponse({ status: 404, description: "Cart item or buyer not found" })
  async removeFromCart(@Param("itemId") itemId: string, @GetUser() user: any) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { userId: user.id },
    });
    if (!buyer) {
      throw new NotFoundException("Buyer profile not found");
    }
    return this.cartService.removeFromCart(buyer.id, itemId);
  }

  @Delete("clear")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Clear cart",
    description: "Buyer only: Remove all items from the cart",
  })
  @ApiResponse({
    status: 200,
    description: "Cart cleared successfully",
    schema: { example: { message: "Cart cleared successfully" } },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Buyer access required",
  })
  @ApiResponse({ status: 404, description: "Buyer profile not found" })
  async clearCart(@GetUser() user: any) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { userId: user.id },
    });
    if (!buyer) {
      throw new NotFoundException("Buyer profile not found");
    }
    return this.cartService.clearCart(buyer.id);
  }
}
