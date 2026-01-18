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
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserType } from '../auth/dto/register.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('cart')
@UseGuards(JwtAuthGuard)
@Roles(UserType.BUYER)
@UseGuards(RolesGuard)
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
      throw new NotFoundException('Buyer profile not found');
    }
    return this.cartService.getCart(buyer.id);
  }

  @Post('add')
  async addToCart(@Body() addToCartDto: AddToCartDto, @GetUser() user: any) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { userId: user.id },
    });
    if (!buyer) {
      throw new NotFoundException('Buyer profile not found');
    }
    return this.cartService.addToCart(buyer.id, addToCartDto);
  }

  @Patch('items/:itemId')
  async updateCartItem(
    @Param('itemId') itemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
    @GetUser() user: any,
  ) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { userId: user.id },
    });
    if (!buyer) {
      throw new NotFoundException('Buyer profile not found');
    }
    return this.cartService.updateCartItem(buyer.id, itemId, updateCartItemDto);
  }

  @Delete('items/:itemId')
  async removeFromCart(@Param('itemId') itemId: string, @GetUser() user: any) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { userId: user.id },
    });
    if (!buyer) {
      throw new NotFoundException('Buyer profile not found');
    }
    return this.cartService.removeFromCart(buyer.id, itemId);
  }

  @Delete('clear')
  async clearCart(@GetUser() user: any) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { userId: user.id },
    });
    if (!buyer) {
      throw new NotFoundException('Buyer profile not found');
    }
    return this.cartService.clearCart(buyer.id);
  }
}
