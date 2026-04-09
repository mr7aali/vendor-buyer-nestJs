import { PrismaService } from "../prisma/prisma.service";
import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
// import {
//   ApiTags,
//   ApiOperation,
//   ApiResponse,
//   ApiBearerAuth,
//   ApiParam,
//   ApiBody,
// } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { VendorBuyerConnectionsService } from "./vendor-buyer-connections.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserType } from "../auth/dto/register.dto";
import { RolesGuard } from "../auth/guards/roles.guard";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { ConnectVendorDto } from "./dto/connect-vendor.dto";
import { GetExploreVendorsQueryDto } from "./dto/get-explore-vendors.dto";
import QRCode from "qrcode";
import { ConfigService } from "@nestjs/config";

@Controller("connections")
@UseGuards(JwtAuthGuard)
export class VendorBuyerConnectionsController {
  constructor(
    private readonly connectionsService: VendorBuyerConnectionsService,
    private readonly prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  @Post("connect")
  @Roles(UserType.BUYER)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  async connectToVendor(
    @Body() connectDto: ConnectVendorDto,
    @GetUser() user: any,
  ) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { userId: user.id },
    });
    if (!buyer) {
      throw new NotFoundException("Buyer profile not found");
    }
    return this.connectionsService.connectBuyerToVendor(
      buyer.id,
      connectDto.vendorCode,
    );
  }

  @Get()
  async getMyConnections(@GetUser() user: any) {
    if (user.userType === "buyer") {
      const buyer = await this.prisma.buyer.findUnique({
        where: { userId: user.id },
      });
      if (!buyer) {
        throw new NotFoundException("Buyer profile not found");
      }
      return this.connectionsService.getBuyerConnections(buyer.id);
    } else if (user.userType === "vendor") {
      const vendor = await this.prisma.vendor.findUnique({
        where: { userId: user.id },
      });
      if (!vendor) {
        throw new NotFoundException("Vendor profile not found");
      }
      return this.connectionsService.getVendorConnections(vendor.id);
    }
  }

  @Get("vendors")
  @Roles(UserType.BUYER)
  @UseGuards(RolesGuard)
  async getExploreVendors(
    @GetUser() user: any,
    @Query() query: GetExploreVendorsQueryDto,
  ) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { userId: user.id },
    });

    if (!buyer) {
      throw new NotFoundException("Buyer profile not found");
    }

    return this.connectionsService.getExploreVendors(buyer.id, query);
  }

  @Get("qr/:vendorId")
  async generateQr(@Param("vendorId") vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });
    if (!vendor) throw new Error("Vendor not found");

    // Encode just vendorCode in QR
    const qrUrl = `${this.configService.get<string>("APP_BASE_URL")}/vendor-qr?vendorCode=${vendor.vendorCode}`;
    const qrDataUrl = await QRCode.toDataURL(qrUrl);

    return { qrDataUrl, vendorCode: vendor.vendorCode };
  }
  @Delete("disconnect/:vendorId")
  @Roles(UserType.BUYER)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  async disconnectFromVendor(
    @Param("vendorId") vendorId: string,
    @GetUser() user: any,
  ) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { userId: user.id },
    });
    if (!buyer) {
      throw new NotFoundException("Buyer profile not found");
    }
    return this.connectionsService.disconnectBuyerFromVendor(
      buyer.id,
      vendorId,
    );
  }
}
