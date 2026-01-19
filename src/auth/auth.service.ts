import { Buyer } from "./../../generated/prisma/browser";
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
// import {
//   ForgotPasswordDto,
//   VerifyOtpDto,
//   ResetPasswordDto,
// } from "./dto/forgot-password.dto";

// In-memory storage for OTPs (for production, use Redis)
interface OtpData {
  otp: string;
  expiresAt: Date;
  verified: boolean;
}

@Injectable()
export class AuthService {
  private otpStorage = new Map<string, OtpData>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly emailService: EmailService,
  ) {
    // Clean up expired OTPs every 5 minutes
    setInterval(() => this.cleanupExpiredOtps(), 5 * 60 * 1000);
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
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictException("Buyer with this email already exists");
    }

    try {
      const [profileImage, nidFontUrl, nidBackUrl] = await Promise.all([
        this.cloudinaryService.uploadFile(files.profilePhotoUrl[0]),
        this.cloudinaryService.uploadFile(files.nidFontPhotoUrl[0]),
        this.cloudinaryService.uploadFile(files.nidBackPhotoUrl[0]),
      ]);
      return await this.prisma.buyer.create({
        data: {
          userId: userId,
          fulllName: data.fullName,
          email: data.email,
          phone: data.phone,
          nidNumber: data.nidNumber,
          nidFontPhotoUrl: nidFontUrl.secure_url,
          nidBackPhotoUrl: nidBackUrl.secure_url,
          profilePhotoUrl: profileImage.secure_url,
          gender: data.gender,
        },
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to upload images: ${error.message}`,
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
      where: { email: data.email },
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

      return {
        id: vendor.id,
        fulllName: vendor.fulllName,
        email: vendor.email,
        storename: vendor.storename,
        vendorCode: vendor.vendorCode,
        message: "Vendor registered successfully",
      };
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

  // Forgot Password Methods
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: forgotPasswordDto.email },
    });

    if (!user) {
      throw new NotFoundException("User with this email does not exist");
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP with 10-minute expiration
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    this.otpStorage.set(forgotPasswordDto.email, {
      otp,
      expiresAt,
      verified: false,
    });

    // Send OTP via email
    await this.emailService.sendOtpEmail(forgotPasswordDto.email, otp);

    return {
      message: "OTP sent to your email successfully",
      email: forgotPasswordDto.email,
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const otpData = this.otpStorage.get(verifyOtpDto.email);

    if (!otpData) {
      throw new BadRequestException("No OTP found for this email");
    }

    if (new Date() > otpData.expiresAt) {
      this.otpStorage.delete(verifyOtpDto.email);
      throw new BadRequestException("OTP has expired");
    }

    if (otpData.otp !== verifyOtpDto.otp) {
      throw new BadRequestException("Invalid OTP");
    }

    // Mark OTP as verified
    otpData.verified = true;
    this.otpStorage.set(verifyOtpDto.email, otpData);

    return {
      message: "OTP verified successfully",
      verified: true,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const otpData = this.otpStorage.get(resetPasswordDto.email);

    if (!otpData) {
      throw new BadRequestException("No OTP found for this email");
    }

    if (new Date() > otpData.expiresAt) {
      this.otpStorage.delete(resetPasswordDto.email);
      throw new BadRequestException("OTP has expired");
    }

    if (otpData.otp !== resetPasswordDto.otp) {
      throw new BadRequestException("Invalid OTP");
    }

    if (!otpData.verified) {
      throw new BadRequestException(
        "OTP not verified. Please verify OTP first",
      );
    }

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

    // Remove OTP from storage
    this.otpStorage.delete(resetPasswordDto.email);

    return {
      message: "Password reset successfully",
    };
  }

  private cleanupExpiredOtps() {
    const now = new Date();
    for (const [email, otpData] of this.otpStorage.entries()) {
      if (now > otpData.expiresAt) {
        this.otpStorage.delete(email);
      }
    }
  }

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
