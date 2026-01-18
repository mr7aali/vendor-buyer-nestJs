import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(vendorId: string, createCategoryDto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        ...createCategoryDto,
        vendorId,
        displayOrder: createCategoryDto.displayOrder || 0,
      },
    });
  }

  async findAllByVendor(vendorId: string) {
    return this.prisma.category.findMany({
      where: { vendorId },
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  async findOne(id: string, vendorId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          where: { isAvailable: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category.vendorId !== vendorId) {
      throw new ForbiddenException('You do not have access to this category');
    }

    return category;
  }

  async update(id: string, vendorId: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.findOne(id, vendorId);
    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  async remove(id: string, vendorId: string) {
    await this.findOne(id, vendorId);
    return this.prisma.category.delete({
      where: { id },
    });
  }

  async getCategoriesForBuyer(buyerId: string, vendorId: string) {
    // Check if buyer is connected to vendor
    const connection = await this.prisma.vendorBuyerConnection.findUnique({
      where: {
        vendorId_buyerId: {
          vendorId,
          buyerId,
        },
      },
    });

    if (!connection || !connection.isActive) {
      throw new ForbiddenException('You are not connected to this vendor');
    }

    return this.prisma.category.findMany({
      where: { vendorId },
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }
}
