import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
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
import { EmailService } from "./email.service";
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from "./dto/forgot-password";
import { ConfigService } from "@nestjs/config";
// import {
//   ForgotPasswordDto,
//   ResetPasswordDto,
//   VerifyOtpDto,
// } from "./dto/forgot-password.dto";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly emailService: EmailService,
    private configService: ConfigService,
  ) {
    // Clean up expired OTPs every hour
    setInterval(() => this.cleanupExpiredOtps(), 60 * 60 * 1000);
  }

  async registerUser(data: UserRegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictException("User with this email already exists");
    }

    if (data.password !== data.confirmPassword) {
      throw new ConflictException("Password and Confirm Password do not match");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
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
    files,
  }: {
    data: BuyerRegisterFullDto;
    userId: string;
    files: {
      nidFontPhotoUrl?: Express.Multer.File[];
      nidBackPhotoUrl?: Express.Multer.File[];
      profilePhotoUrl?: Express.Multer.File[];
    };
  }) {
    if (
      !files?.nidFontPhotoUrl ||
      !files?.nidBackPhotoUrl ||
      !files?.profilePhotoUrl
    ) {
      throw new BadRequestException(
        "Missing required files: nidFontPhotoUrl, nidBackPhotoUrl, profilePhotoUrl",
      );
    }

    const existingUser = await this.prisma.buyer.findUnique({
      where: { userId: userId },
    });

    if (existingUser) {
      throw new ConflictException("Buyer with this email already exists");
    }

    try {
      // Upload all images in parallel
      const [profileImage, nidFontUrl, nidBackUrl] = await Promise.all([
        this.cloudinaryService.uploadFile(files.profilePhotoUrl[0]),
        this.cloudinaryService.uploadFile(files.nidFontPhotoUrl[0]),
        this.cloudinaryService.uploadFile(files.nidBackPhotoUrl[0]),
      ]);

      // Use a transaction for both operations
      await this.prisma.$transaction(async (prisma) => {
        const r = await prisma.buyer.create({
          data: {
            userId: userId,
            fulllName: data.fullName,
            // email: data.email,
            phone: data.phone,
            nidNumber: data.nidNumber,
            nidFontPhotoUrl: nidFontUrl.secure_url,
            nidBackPhotoUrl: nidBackUrl.secure_url,
            profilePhotoUrl: profileImage.secure_url,
            gender: data.gender,
          },
        });

        await prisma.user.update({
          where: { id: userId },
          data: { userType: UserType.BUYER },
        });
        return r;
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to register buyer: ${error.message}`,
      );
    }
  }

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

    const existingVendor = await this.prisma.vendor.findUnique({
      where: { userId: userId },
    });

    if (existingVendor) {
      throw new ConflictException("Vendor with this email already exists");
    }

    const existingUserVendor = await this.prisma.vendor.findUnique({
      where: { userId: userId },
    });

    if (existingUserVendor) {
      throw new ConflictException("User is already registered as a vendor");
    }

    try {
      const [logoResult, nidFrontResult, nidBackResult, businessIdResult] =
        await Promise.all([
          this.cloudinaryService.uploadFile(files.logo[0]),
          this.cloudinaryService.uploadFile(files.nidFront[0]),
          this.cloudinaryService.uploadFile(files.nidBack[0]),
          files.businessId
            ? this.cloudinaryService.uploadFile(files.businessId[0])
            : Promise.resolve(null),
        ]);
      await this.prisma.$transaction(async () => {
        const vendor = await this.prisma.vendor.create({
          data: {
            userId: userId,
            fulllName: data.fulllName,
            // email: data.email,
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
        await this.prisma.user.update({
          where: {
            id: userId,
          },
          data: {
            userType: UserType.VENDOR,
          },
        });

        return {
          id: vendor.id,
          fulllName: vendor.fulllName,
          // email: vendor.email,
          storename: vendor.storename,
          vendorCode: vendor.vendorCode,
          message: "Vendor registered successfully",
        };
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to upload images: ${error.message}`,
      );
    }
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
    const { accessToken, refreshToken } = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, refreshToken);
    // const payload = {
    //   sub: user.id,
    //   email: user.email,
    //   userType: user.userType,
    // };
    // const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        userType: user.userType,
      },
    };
  }

  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      userType: user.userType,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get("JWT_ACCESS_SECRET") || "bangladesh_1971",
      // expiresIn: "15m",
      expiresIn: "1d",
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get("JWT_REFRESH_SECRET"),
      expiresIn: "7d",
    });
    return { accessToken, refreshToken };
  }
  private async storeRefreshToken(userId: string, refreshToken: string) {
    const tokenHash = await bcrypt.hash(refreshToken, 10);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }
  async refreshTokens(refreshToken: string) {
    let payload;
    if (!refreshToken) {
      throw new NotFoundException("refreshToken not found.");
    }
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        userId: payload.sub,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    const validToken = await Promise.any(
      tokens.map(async (t) =>
        (await bcrypt.compare(refreshToken, t.tokenHash)) ? t : null,
      ),
    ).catch(() => null);

    if (!validToken) {
      throw new UnauthorizedException("Refresh token revoked");
    }

    // ROTATION: revoke old token
    await this.prisma.refreshToken.update({
      where: { id: validToken.id },
      data: { revoked: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const newTokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, newTokens.refreshToken);

    return newTokens;
  }

  // ==================== FORGOT PASSWORD METHODS ====================

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { email: forgotPasswordDto.email },
    });

    if (!user) {
      throw new NotFoundException("User with this email does not exist");
    }

    // Delete any existing OTPs for this email
    await this.prisma.passwordResetOtp.deleteMany({
      where: { email: forgotPasswordDto.email },
    });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in database with 10-minute expiration
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.prisma.passwordResetOtp.create({
      data: {
        email: forgotPasswordDto.email,
        otp,
        expiresAt,
        verified: false,
      },
    });

    // Send OTP via email
    await this.emailService.sendOtpEmail(forgotPasswordDto.email, otp);

    return {
      success: true,
      message: "OTP sent to your email successfully",
      email: forgotPasswordDto.email,
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    // Find the most recent OTP for this email
    const otpRecord = await this.prisma.passwordResetOtp.findFirst({
      where: {
        email: verifyOtpDto.email,
        otp: verifyOtpDto.otp,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!otpRecord) {
      throw new BadRequestException("Invalid OTP");
    }

    // Check if OTP has expired
    if (new Date() > otpRecord.expiresAt) {
      await this.prisma.passwordResetOtp.delete({
        where: { id: otpRecord.id },
      });
      throw new BadRequestException(
        "OTP has expired. Please request a new one",
      );
    }

    // Mark OTP as verified
    await this.prisma.passwordResetOtp.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    return {
      success: true,
      message: "OTP verified successfully",
      verified: true,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    // Find the most recent OTP for this email
    const otpRecord = await this.prisma.passwordResetOtp.findFirst({
      where: {
        email: resetPasswordDto.email,
        otp: resetPasswordDto.otp,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!otpRecord) {
      throw new BadRequestException("Invalid OTP");
    }

    // Check if OTP has expired
    if (new Date() > otpRecord.expiresAt) {
      await this.prisma.passwordResetOtp.delete({
        where: { id: otpRecord.id },
      });
      throw new BadRequestException(
        "OTP has expired. Please request a new one",
      );
    }

    // Check if OTP was verified
    if (!otpRecord.verified) {
      throw new BadRequestException(
        "OTP not verified. Please verify OTP first",
      );
    }

    // Validate password match
    if (resetPasswordDto.newPassword !== resetPasswordDto.confirmPassword) {
      throw new BadRequestException("Passwords do not match");
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(resetPasswordDto.newPassword, 10);

    // Update user password
    await this.prisma.user.update({
      where: { email: resetPasswordDto.email },
      data: { passwordHash },
    });

    // Delete all OTPs for this email
    await this.prisma.passwordResetOtp.deleteMany({
      where: { email: resetPasswordDto.email },
    });

    return {
      success: true,
      message:
        "Password reset successfully. You can now login with your new password",
    };
  }

  // Clean up expired OTPs (runs automatically every hour)
  private async cleanupExpiredOtps() {
    try {
      const result = await this.prisma.passwordResetOtp.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
      if (result.count > 0) {
        console.log(`Cleaned up ${result.count} expired OTPs`);
      }
    } catch (error) {
      console.error("Error cleaning up expired OTPs:", error);
    }
  }

  // ==================== OTHER METHODS ====================

  private generateVendorCode(): string {
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
    return await this.prisma.user.findMany({
      include: {
        vendor: true,
        buyer: true,
        notifications: true,
        _count: true,
        receivedMessages: true,
        sentMessages: true,
      },
    });
  }
}
