import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/dto/create-notification.dto";
import { GetExploreVendorsQueryDto } from "./dto/get-explore-vendors.dto";

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

  async getExploreVendors(
    buyerId: string,
    query: GetExploreVendorsQueryDto = {},
  ) {
    const search = String(query?.search || "").trim();

    const vendors = await this.prisma.vendor.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: "insensitive" } },
                { storename: { contains: search, mode: "insensitive" } },
                { businessName: { contains: search, mode: "insensitive" } },
                { storeDescription: { contains: search, mode: "insensitive" } },
                {
                  businessDescription: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                { address: { contains: search, mode: "insensitive" } },
                { vendorCode: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        userId: true,
        vendorCode: true,
        fullName: true,
        storename: true,
        businessName: true,
        address: true,
        storeDescription: true,
        businessDescription: true,
        logoUrl: true,
        isActive: true,
        averageRating: true,
        totalReviews: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            products: true,
            categories: true,
            connections: true,
          },
        },
        connections: {
          where: {
            buyerId,
            isActive: true,
          },
          select: {
            id: true,
            connectedAt: true,
          },
          take: 1,
        },
      },
      orderBy: [{ averageRating: "desc" }, { createdAt: "desc" }],
    });

    return vendors.map((vendor) => {
      const activeConnection = vendor.connections[0] || null;

      return {
        id: vendor.id,
        userId: vendor.userId,
        vendorCode: vendor.vendorCode,
        fullName: vendor.fullName,
        storename: vendor.storename,
        businessName: vendor.businessName,
        address: vendor.address,
        storeDescription: vendor.storeDescription,
        businessDescription: vendor.businessDescription,
        logoUrl: vendor.logoUrl,
        isActive: vendor.isActive,
        averageRating: Number(vendor.averageRating || 0),
        totalReviews: vendor.totalReviews || 0,
        counts: {
          products: vendor._count.products,
          categories: vendor._count.categories,
          connections: vendor._count.connections,
        },
        isConnected: Boolean(activeConnection),
        connection: activeConnection,
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt,
      };
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
