import { PrismaService } from '../prisma/prisma.service';
import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VendorBuyerConnectionsService } from './vendor-buyer-connections.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from '../auth/dto/register.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { ConnectVendorDto } from './dto/connect-vendor.dto';

@ApiTags('Vendor-Buyer Connections')
@ApiBearerAuth('JWT-auth')
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
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Connect to vendor', description: 'Buyer only: Connect to a vendor using their vendor code. Required to view and purchase products from the vendor.' })
  @ApiResponse({ status: 201, description: 'Successfully connected to vendor' })
  @ApiResponse({ status: 400, description: 'Bad request - Already connected or vendor is inactive' })
  @ApiResponse({ status: 403, description: 'Forbidden - Buyer access required' })
  @ApiResponse({ status: 404, description: 'Vendor not found with this code' })
  @ApiBody({ type: ConnectVendorDto })
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
  @ApiOperation({ summary: 'Get my connections', description: 'Get all connections - Buyers see vendors they are connected to, Vendors see buyers connected to them' })
  @ApiResponse({ status: 200, description: 'Connections retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Buyer or vendor profile not found' })
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect from vendor', description: 'Buyer only: Disconnect from a vendor. This will prevent access to vendor products and services.' })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID to disconnect from', example: 'uuid-here' })
  @ApiResponse({ status: 200, description: 'Successfully disconnected from vendor' })
  @ApiResponse({ status: 403, description: 'Forbidden - Buyer access required' })
  @ApiResponse({ status: 404, description: 'Connection or buyer not found' })
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
