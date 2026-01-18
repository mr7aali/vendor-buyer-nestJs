import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VendorBuyerConnectionsService {
  constructor(private prisma: PrismaService) {}

  async connectBuyerToVendor(buyerId: string, vendorCode: string) {
    // Find vendor by code
    const vendor = await this.prisma.vendor.findUnique({
      where: { vendorCode },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found with this code');
    }

    if (!vendor.isActive) {
      throw new BadRequestException('Vendor is not active');
    }

    // Check if already connected
    const existingConnection = await this.prisma.vendorBuyerConnection.findUnique({
      where: {
        vendorId_buyerId: {
          vendorId: vendor.id,
          buyerId,
        },
      },
    });

    if (existingConnection) {
      if (existingConnection.isActive) {
        throw new BadRequestException('Already connected to this vendor');
      }
      // Reactivate connection
      return this.prisma.vendorBuyerConnection.update({
        where: { id: existingConnection.id },
        data: { isActive: true, connectedAt: new Date() },
        include: {
          vendor: {
            select: {
              id: true,
              vendorCode: true,
              businessName: true,
            },
          },
        },
      });
    }

    // Create new connection
    return this.prisma.vendorBuyerConnection.create({
      data: {
        vendorId: vendor.id,
        buyerId,
      },
      include: {
        vendor: {
          select: {
            id: true,
            vendorCode: true,
            businessName: true,
          },
        },
      },
    });
  }

  async getBuyerConnections(buyerId: string) {
    return this.prisma.vendorBuyerConnection.findMany({
      where: {
        buyerId,
        isActive: true,
      },
      include: {
        vendor: {
          select: {
            id: true,
            vendorCode: true,
            businessName: true,
            businessDescription: true,
            logoUrl: true,
          },
        },
      },
      orderBy: {
        connectedAt: 'desc',
      },
    });
  }

  async getVendorConnections(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return this.prisma.vendorBuyerConnection.findMany({
      where: {
        vendorId,
        isActive: true,
      },
      include: {
        buyer: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: {
        connectedAt: 'desc',
      },
    });
  }

  async disconnectBuyerFromVendor(buyerId: string, vendorId: string) {
    const connection = await this.prisma.vendorBuyerConnection.findUnique({
      where: {
        vendorId_buyerId: {
          vendorId,
          buyerId,
        },
      },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    return this.prisma.vendorBuyerConnection.update({
      where: { id: connection.id },
      data: { isActive: false },
    });
  }

  async isConnected(buyerId: string, vendorId: string): Promise<boolean> {
    const connection = await this.prisma.vendorBuyerConnection.findUnique({
      where: {
        vendorId_buyerId: {
          vendorId,
          buyerId,
        },
      },
    });

    return connection?.isActive || false;
  }
}
