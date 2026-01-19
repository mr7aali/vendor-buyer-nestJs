import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcrypt";
import { UserType } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

import { v4 as uuidv4 } from "uuid";
import { UserRegisterDto } from "./dto/user-create.dto";
import { BuyerRegisterFullDto } from "./dto/buyer-register-full.dto";
import { VendorRegisterDto } from "./dto/vendor-register.dto";
import { CloudinaryService } from "src/cloudinary/cloudinary.service";
// import { VendorRegisterDto } from "./dto/buyer-register.dto";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private readonly cloudinaryService: CloudinaryService,
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
  // async registerVendor({
  //   data,
  //   userId,
  // }: {
  //   data: VendorRegisterDto;
  //   userId: string;
  // }) {
  //   // Check if user already exists

  //   const existingUser = await this.prisma.vendor.findUnique({
  //     where: { email: data.email },
  //   });

  //   if (existingUser) {
  //     throw new ConflictException("Vendor with this email already exists");
  //   }

  //   // Create user
  //   const user = await this.prisma.vendor.create({
  //     data: {
  //       userId: userId,
  //       fulllName: data.fulllName,
  //       email: data.email,
  //       phone: data.phone,
  //       address: data.address,
  //       storename: data.storename,
  //       storeDescription: data.storeDescription,
  //       nidFontPhotoUrl: data.nidFontPhotoUrl,
  //       nidBackPhotoUrl: data.nidBackPhotoUrl,
  //       logoUrl: data.logoUrl,
  //       nationalIdNumber: data.nationalIdNumber,
  //       bussinessRegNumber: data.bussinessRegNumber,
  //       gender: data.gender,
  //       vendorCode: this.generateVendorCode(),
  //       bussinessIdPhotoUrl: data.bussinessIdPhotoUrl || "",
  //     },
  //   });
  //   return user;
  // }
  async registerVendor({
    data,
    userId,
    files,
  }: {
    data: VendorRegisterDto;
    userId: string;
    files: {
      logo?: Express.Multer.File[];
      nidFront?: Express.Multer.File[];
      nidBack?: Express.Multer.File[];
      businessId?: Express.Multer.File[];
    };
  }) {
    // Validate required files
    if (
      !files?.logo ||
      !files?.nidFront ||
      !files?.nidBack ||
      !files.businessId
    ) {
      throw new BadRequestException(
        "Logo (logo), NID front (nidFront), businessId and NID (nidBack) back images are required",
      );
    }

    // Check if vendor already exists
    const existingVendor = await this.prisma.vendor.findUnique({
      where: { email: data.email },
    });

    if (existingVendor) {
      throw new ConflictException("Vendor with this email already exists");
    }

    // Check if user is already a vendor
    const existingUserVendor = await this.prisma.vendor.findUnique({
      where: { userId: userId },
    });

    if (existingUserVendor) {
      throw new ConflictException("User is already registered as a vendor");
    }

    try {
      // Upload images to Cloudinary
      const [logoResult, nidFrontResult, nidBackResult, businessIdResult] =
        await Promise.all([
          this.cloudinaryService.uploadFile(files.logo[0]),
          this.cloudinaryService.uploadFile(files.nidFront[0]),
          this.cloudinaryService.uploadFile(files.nidBack[0]),
          files.businessId
            ? this.cloudinaryService.uploadFile(files.businessId[0])
            : Promise.resolve(null),
        ]);

      // Create vendor
      const vendor = await this.prisma.vendor.create({
        data: {
          userId: userId,
          fulllName: data.fulllName,
          email: data.email,
          phone: data.phone,
          address: data.address,
          storename: data.storename,
          storeDescription: data.storeDescription,
          logoUrl: logoResult.secure_url,
          nidFontPhotoUrl: nidFrontResult.secure_url,
          nidBackPhotoUrl: nidBackResult.secure_url,
          nationalIdNumber: data.nationalIdNumber,
          bussinessRegNumber: data.bussinessRegNumber,
          gender: data.gender,
          vendorCode: this.generateVendorCode(),
          bussinessIdPhotoUrl: businessIdResult?.secure_url || "",
        },
      });

      // Remove sensitive data before returning
      return {
        id: vendor.id,
        fulllName: vendor.fulllName,
        email: vendor.email,
        storename: vendor.storename,
        vendorCode: vendor.vendorCode,
        message: "Vendor registered successfully",
      };
    } catch (error) {
      // Handle upload errors
      throw new BadRequestException(
        `Failed to upload images: ${error.message}`,
      );
    }
  }

  // private generateVendorCode(): string {
  //   const prefix = "VND";
  //   const timestamp = Date.now().toString(36).toUpperCase();
  //   const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  //   return `${prefix}-${timestamp}-${random}`;
  // }
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
