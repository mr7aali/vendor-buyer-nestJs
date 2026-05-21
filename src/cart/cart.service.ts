import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateCart(buyerId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { buyerId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { buyerId },
      });
    }

    return cart;
  }

  async getCart(buyerId: string) {
    const cart = await this.getOrCreateCart(buyerId);
    return this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                vendor: {
                  select: {
                    id: true,
                    fullName: true,
                    storename: true,
                    businessName: true,
                    vendorCode: true,
                    logoUrl: true,
                    country: true,
                    address: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async addToCart(buyerId: string, addToCartDto: AddToCartDto) {
    // Get buyer's vendor connections to verify access
    const product = await this.prisma.product.findUnique({
      where: { id: addToCartDto.productId },
      include: {
        vendor: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.isAvailable) {
      throw new BadRequestException('Product is not available');
    }

    if (product.stockQuantity < addToCartDto.quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    // Check if buyer is connected to vendor
    const connection = await this.prisma.vendorBuyerConnection.findUnique({
      where: {
        vendorId_buyerId: {
          vendorId: product.vendorId,
          buyerId,
        },
      },
    });

    if (!connection || !connection.isActive) {
      throw new ForbiddenException('You are not connected to this vendor');
    }

    const cart = await this.getOrCreateCart(buyerId);

    // Check if item already exists in cart
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: addToCartDto.productId,
        },
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + addToCartDto.quantity;
      if (product.stockQuantity < newQuantity) {
        throw new BadRequestException('Insufficient stock');
      }
      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          priceAtAddition: product.price,
        },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: addToCartDto.productId,
        quantity: addToCartDto.quantity,
        priceAtAddition: product.price,
      },
      include: {
        product: true,
      },
    });
  }

  async updateCartItem(buyerId: string, itemId: string, updateCartItemDto: UpdateCartItemDto) {
    const cart = await this.getOrCreateCart(buyerId);
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        product: true,
      },
    });

    if (!cartItem || cartItem.cartId !== cart.id) {
      throw new NotFoundException('Cart item not found');
    }

    if (cartItem.product.stockQuantity < updateCartItemDto.quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: {
        quantity: updateCartItemDto.quantity,
        priceAtAddition: cartItem.product.price,
      },
      include: {
        product: true,
      },
    });
  }

  async removeFromCart(buyerId: string, itemId: string) {
    const cart = await this.getOrCreateCart(buyerId);
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
    });

    if (!cartItem || cartItem.cartId !== cart.id) {
      throw new NotFoundException('Cart item not found');
    }

    return this.prisma.cartItem.delete({
      where: { id: itemId },
    });
  }

  async clearCart(buyerId: string) {
    const cart = await this.getOrCreateCart(buyerId);
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });
    return { message: 'Cart cleared successfully' };
  }
}
