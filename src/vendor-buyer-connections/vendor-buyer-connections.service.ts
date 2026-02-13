import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/dto/create-notification.dto";

@Injectable()
export class VendorBuyerConnectionsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async connectBuyerToVendor(buyerId: string, vendorCode: string) {
    // Find vendor by code
    const vendor = await this.prisma.vendor.findUnique({
      where: { vendorCode },
    });

    if (!vendor) {
      throw new NotFoundException("Vendor not found with this code");
    }

    if (!vendor.isActive) {
      throw new BadRequestException("Vendor is not active");
    }

    // Check if already connected
    const existingConnection =
      await this.prisma.vendorBuyerConnection.findUnique({
        where: {
          vendorId_buyerId: {
            vendorId: vendor.id,
            buyerId,
          },
        },
      });

    if (existingConnection) {
      if (existingConnection.isActive) {
        throw new BadRequestException("Already connected to this vendor");
      }
      // Reactivate connection
      const reactivated = await this.prisma.vendorBuyerConnection.update({
        where: { id: existingConnection.id },
        data: { isActive: true, connectedAt: new Date() },
        include: {
          vendor: {
            select: {
              id: true,
              vendorCode: true,
              businessName: true,
              userId: true,
            },
          },
          buyer: {
            select: {
              id: true,
              fullName: true,
              userId: true,
            },
          },
        },
      });

      if (reactivated.vendor?.userId && reactivated.buyer?.fullName) {
        await this.notificationsService.notifyVendor(
          reactivated.vendor.userId,
          {
            title: "Buyer reconnected",
            message: `${reactivated.buyer.fullName} reconnected to your store.`,
            type: NotificationType.INFO,
          },
        );
      }

      return reactivated;
    }

    // Create new connection
    const connection = await this.prisma.vendorBuyerConnection.create({
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
            userId: true,
          },
        },
        buyer: {
          select: {
            id: true,
            fullName: true,
            userId: true,
          },
        },
      },
    });

    if (connection.vendor?.userId && connection.buyer?.fullName) {
      await this.notificationsService.notifyVendor(connection.vendor.userId, {
        title: "New buyer connection",
        message: `${connection.buyer.fullName} connected to your store.`,
        type: NotificationType.SUCCESS,
      });
    }

    return connection;
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
            userId: true,
          },
        },
        buyer: {
          select: {
            id: true,
            fullName: true,
            cart: true,
            userId: true,
          },
        },
      },
      orderBy: {
        connectedAt: "desc",
      },
    });
  }

  async getVendorConnections(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException("Vendor not found");
    }

    return this.prisma.vendorBuyerConnection.findMany({
      where: {
        vendorId,
        isActive: true,
      },
      include: {
        buyer: {
          select: {
            id: true,
            fullName: true,
            cart: true,
            userId: true,
          },
          // include: {
          //   user: {
          //     select: {
          //       id: true,
          //       email: true,
          //     },
          //   },
          // },
        },
        vendor: {
          // include: {
          //   user: true,
          // },
          select: {
            id: true,
            vendorCode: true,
            businessName: true,
            businessDescription: true,
            logoUrl: true,
            userId: true,
          },
        },
      },
      orderBy: {
        connectedAt: "desc",
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
      throw new NotFoundException("Connection not found");
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
