import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { VendorBuyerConnectionsService } from './vendor-buyer-connections.service';
import { ConnectVendorDto } from './dto/connect-vendor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserType } from '../auth/dto/register.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('connections')
@UseGuards(JwtAuthGuard)
export class VendorBuyerConnectionsController {
  constructor(
    private readonly connectionsService: VendorBuyerConnectionsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('connect')
  @Roles(UserType.BUYER)
  @UseGuards(RolesGuard)
  async connectToVendor(
    @Body() connectDto: ConnectVendorDto,
    @GetUser() user: any,
  ) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { userId: user.id },
    });
    if (!buyer) {
      throw new NotFoundException('Buyer profile not found');
    }
    return this.connectionsService.connectBuyerToVendor(
      buyer.id,
      connectDto.vendorCode,
    );
  }

  @Get('my-connections')
  async getMyConnections(@GetUser() user: any) {
    if (user.userType === 'buyer') {
      const buyer = await this.prisma.buyer.findUnique({
        where: { userId: user.id },
      });
      if (!buyer) {
        throw new NotFoundException('Buyer profile not found');
      }
      return this.connectionsService.getBuyerConnections(buyer.id);
    } else if (user.userType === 'vendor') {
      const vendor = await this.prisma.vendor.findUnique({
        where: { userId: user.id },
      });
      if (!vendor) {
        throw new NotFoundException('Vendor profile not found');
      }
      return this.connectionsService.getVendorConnections(vendor.id);
    }
  }

  @Delete('disconnect/:vendorId')
  @Roles(UserType.BUYER)
  @UseGuards(RolesGuard)
  async disconnectFromVendor(
    @Param('vendorId') vendorId: string,
    @GetUser() user: any,
  ) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { userId: user.id },
    });
    if (!buyer) {
      throw new NotFoundException('Buyer profile not found');
    }
    return this.connectionsService.disconnectBuyerFromVendor(buyer.id, vendorId);
  }
}
