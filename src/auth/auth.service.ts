import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcrypt";
import { RegisterDto, UserType } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

import { v4 as uuidv4 } from "uuid";
import { UserRegisterDto } from "./dto/user-create.dto";
import { BuyerRegisterFullDto } from "./dto/buyer-register-full.dto";
import { VendorRegisterDto } from "./dto/buyer-register.dto";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async registerUser(data: UserRegisterDto) {
    // Check if user already exists

    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictException("User with this email already exists");
    }

    if (data.password !== data.confirmPassword) {
      throw new ConflictException("Password and Confirm Password do not match");
    }
    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        userType: UserType.USER,
      },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      userType: user.userType,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        userType: user.userType,
      },
    };
  }
  async registerBuyer({
    data,
    userId,
  }: {
    data: BuyerRegisterFullDto;
    userId: string;
  }) {
    // Check if user already exists

    const existingUser = await this.prisma.buyer.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictException("Buyer with this email already exists");
    }

    // Create user
    const user = await this.prisma.buyer.create({
      data: {
        userId: userId,
        fulllName: data.fulllName,
        email: data.email,
        phone: data.phone,
        nidNumber: data.nidNumber,
        nidFontPhotoUrl: data.nidFontPhotoUrl,
        nidBackPhotoUrl: data.nidBackPhotoUrl,
        profilePhotoUrl: data.profilePhotoUrl,
        gender: data.gender,
      },
    });
    return user;
  }
  async registerVendor({
    data,
    userId,
  }: {
    data: VendorRegisterDto;
    userId: string;
  }) {
    // Check if user already exists

    const existingUser = await this.prisma.vendor.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictException("Vendor with this email already exists");
    }

    // Create user
    const user = await this.prisma.vendor.create({
      data: {
        userId: userId,
        fulllName: data.fulllName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        storename: data.storename,
        storeDescription: data.storeDescription,
        nidFontPhotoUrl: data.nidFontPhotoUrl,
        nidBackPhotoUrl: data.nidBackPhotoUrl,
        logoUrl: data.logoUrl,
        nationalIdNumber: data.nationalIdNumber,
        bussinessRegNumber: data.bussinessRegNumber,
        gender: data.gender,
        vendorCode: this.generateVendorCode(),
        bussinessIdPhotoUrl: data.bussinessIdPhotoUrl || "",
      },
    });
    return user;
  }
  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const payload = {
      sub: user.id,
      email: user.email,
      userType: user.userType,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        userType: user.userType,
      },
    };
  }

  private generateVendorCode(): string {
    // Generate a unique vendor code (e.g., VENDOR-XXXX)
    const randomPart = uuidv4().substring(0, 8).toUpperCase();
    return `VENDOR-${randomPart}`;
  }

  async getAllVendor() {
    return await this.prisma.vendor.findMany({});
  }
  async getAllBuyer() {
    return await this.prisma.buyer.findMany({});
  }
  async getAlluser() {
    return await this.prisma.user.findMany({});
  }
}
