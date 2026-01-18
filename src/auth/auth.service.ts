import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VendorRegisterDto } from './dto/vendor-register.dto';
import { BuyerRegisterDto } from './dto/buyer-register.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto, additionalData?: VendorRegisterDto | BuyerRegisterDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash,
        userType: registerDto.userType,
        fullName: registerDto.fullName,
        phone: registerDto.phone,
      },
    });

    // Create vendor or buyer profile
    if (registerDto.userType === 'vendor' && additionalData) {
      const vendorData = additionalData as VendorRegisterDto;
      const vendorCode = this.generateVendorCode();
      await this.prisma.vendor.create({
        data: {
          userId: user.id,
          vendorCode,
          businessName: vendorData.businessName,
          businessDescription: vendorData.businessDescription,
          businessAddress: vendorData.businessAddress,
          logoUrl: vendorData.logoUrl,
        },
      });
    } else if (registerDto.userType === 'buyer' && additionalData) {
      const buyerData = additionalData as BuyerRegisterDto;
      await this.prisma.buyer.create({
        data: {
          userId: user.id,
          shippingAddress: buyerData.shippingAddress,
          city: buyerData.city,
          postalCode: buyerData.postalCode,
        },
      });
    }

    // Generate JWT token
    const payload = { sub: user.id, email: user.email, userType: user.userType };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        userType: user.userType,
        fullName: user.fullName,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, userType: user.userType };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        userType: user.userType,
        fullName: user.fullName,
      },
    };
  }

  private generateVendorCode(): string {
    // Generate a unique vendor code (e.g., VENDOR-XXXX)
    const randomPart = uuidv4().substring(0, 8).toUpperCase();
    return `VENDOR-${randomPart}`;
  }
}
