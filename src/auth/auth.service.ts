import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
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
import { AdminLoginDto } from "./dto/admin-login.dto";
import { CreateSuperAdminDto } from "./dto/create-super-admin.dto";
import { CreateEmployeeDto } from "./dto/Employee.dto";
import { UpdateProfileDto } from "./dto/update.dto";
import { GetAllUsersQueryDto } from "./dto/getall.query.dto";
import { GetAllVendorsQueryDto, VendorSortBy } from "./dto/getAllVendors";
import { OrderStatus } from "src/orders/dto/update-order-status.dto";
// import { CreateEmployeeDto } from "./dto/create-employee.dto";

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
      include: {
        buyer: true,
        vendor: true,
      },
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

    if (user.userType === UserType.BUYER && user.buyer) {
      return {
        accessToken,
        refreshToken,
        user: {
          id: user.buyer.id,
          email: user.email,
          userType: user.userType,
        },
      };
    } else if (user.vendor && user.userType === UserType.VENDOR) {
      return {
        accessToken,
        refreshToken,
        user: {
          id: user.vendor.id,
          email: user.email,
          userType: user.userType,
        },
      };
    } else {
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
  }

  async adminLogin(dto: AdminLoginDto) {
    const admin = await this.prisma.admin.findUnique({
      where: { email: dto.email },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!admin) {
      throw new UnauthorizedException("Invalid admin credentials");
    }

    const isValid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException("Invalid admin credentials");
    }

    const payload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      type: "ADMIN",
      permissions: admin?.permissions?.map((p) => p?.permission?.key),
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get("JWT_ADMIN_ACCESS_SECRET"),
      expiresIn: "1d",
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get("JWT_ADMIN_REFRESH_SECRET"),
      expiresIn: "1d",
    });
    return {
      accessToken,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        permissions: payload.permissions,
      },
    };
  }

  async createSuperAdmin(dto: CreateSuperAdminDto) {
    const BOOTSTRAP_SECRET =
      this.configService.get("SUPER_ADMIN_SECRET") || "INIT_SUPER_ADMIN";

    if (dto.secret !== BOOTSTRAP_SECRET) {
      throw new UnauthorizedException("Invalid bootstrap secret");
    }

    const exists = await this.prisma.admin.findUnique({
      where: { email: dto.email },
    });

    if (exists) {
      throw new ConflictException("Super admin already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const admin = await this.prisma.admin.create({
      data: {
        email: dto.email,
        passwordHash,
        role: "SUPER_ADMIN",
      },
    });

    return {
      success: true,
      message: "Super admin created successfully",
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
    };
  }

  // ==================== EMPLOYEE MANAGEMENT ====================

  /**
   * Create a new employee (admin with EMPLOYEE role)
   */
  async createEmployee(dto: CreateEmployeeDto) {
    // Check if email already exists
    const existingAdmin = await this.prisma.admin.findUnique({
      where: { email: dto.email },
    });

    if (existingAdmin) {
      throw new ConflictException("Employee with this email already exists");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create employee
    const employee = await this.prisma.admin.create({
      data: {
        email: dto.email,
        passwordHash,
        role: "EMPLOYEE",
      },
    });

    // Assign initial permissions if provided
    if (dto.permissions && dto.permissions.length > 0) {
      await this.updateEmployeePermissions(employee.id, dto.permissions);
    }

    return {
      success: true,
      message: "Employee created successfully",
      employee: {
        id: employee.id,
        email: employee.email,
        role: employee.role,
      },
    };
  }

  /**
   * Get all employees
   */
  async getAllEmployees() {
    const employees = await this.prisma.admin.findMany({
      where: {
        role: "EMPLOYEE",
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return employees.map((employee) => ({
      id: employee.id,
      email: employee.email,
      role: employee.role,
      createdAt: employee.createdAt,
      permissions: employee.permissions.map((p) => ({
        id: p.permission.id,
        key: p.permission.key,
        name: p.permission.name,
        description: p.permission.description,
      })),
    }));
  }

  /**
   * Get employee by ID
   */
  async getEmployeeById(employeeId: number) {
    const employee = await this.prisma.admin.findUnique({
      where: { id: employeeId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    return {
      id: employee.id,
      email: employee.email,
      role: employee.role,
      createdAt: employee.createdAt,
      permissions: employee.permissions.map((p) => ({
        id: p.permission.id,
        key: p.permission.key,
        name: p.permission.name,
        description: p.permission.description,
      })),
    };
  }

  /**
   * Update employee permissions
   */
  async updateEmployeePermissions(
    employeeId: number,
    permissionKeys: string[],
  ) {
    // Verify employee exists
    const employee = await this.prisma.admin.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    // Cannot modify super admin permissions
    if (employee.role === "SUPER_ADMIN") {
      throw new ForbiddenException("Cannot modify super admin permissions");
    }

    // Get permission records
    const permissionRecords = await this.prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
    });

    // Verify all permissions exist
    if (permissionRecords.length !== permissionKeys.length) {
      const foundKeys = permissionRecords.map((p) => p.key);
      const missingKeys = permissionKeys.filter((k) => !foundKeys.includes(k));
      throw new BadRequestException(
        `Invalid permission keys: ${missingKeys.join(", ")}`,
      );
    }

    // Delete existing permissions
    await this.prisma.adminPermission.deleteMany({
      where: { adminId: employeeId },
    });

    // Create new permissions
    if (permissionRecords.length > 0) {
      await this.prisma.adminPermission.createMany({
        data: permissionRecords.map((p) => ({
          adminId: employeeId,
          permissionId: p.id,
        })),
      });
    }

    return {
      success: true,
      message: "Employee permissions updated successfully",
      permissions: permissionRecords.map((p) => ({
        key: p.key,
        name: p.name,
      })),
    };
  }

  /**
   * Delete employee
   */
  async deleteEmployee(employeeId: number) {
    const employee = await this.prisma.admin.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    // Cannot delete super admin
    if (employee.role === "SUPER_ADMIN") {
      throw new ForbiddenException("Cannot delete super admin");
    }

    // Delete employee and their permissions (cascade)
    await this.prisma.admin.delete({
      where: { id: employeeId },
    });

    return {
      success: true,
      message: "Employee deleted successfully",
    };
  }

  /**
   * Get all available permissions
   */
  async getAllPermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: {
        key: "asc",
      },
    });

    return permissions;
  }

  /**
   * Seed initial permissions (for development/setup)
   */
  async seedPermissions() {
    const permissions = [
      // Dashboard
      {
        key: "dashboard.view",
        name: "View Dashboard",
        description: "Access to main dashboard",
      },

      // Analytics
      {
        key: "analytics.view",
        name: "View Analytics",
        description: "View analytics, charts, and insights",
      },

      // Buyers Management
      {
        key: "buyers.view",
        name: "View Buyers",
        description: "View buyer list and buyer details",
      },
      {
        key: "buyers.create",
        name: "Create Buyer",
        description: "Create new buyer accounts",
      },
      {
        key: "buyers.edit",
        name: "Edit Buyer",
        description: "Edit existing buyer information",
      },
      {
        key: "buyers.delete",
        name: "Delete Buyer",
        description: "Delete buyer accounts",
      },

      // Vendors Management
      {
        key: "vendors.view",
        name: "View Vendors",
        description: "View vendor list and vendor details",
      },
      {
        key: "vendors.create",
        name: "Create Vendor",
        description: "Create new vendor accounts",
      },
      {
        key: "vendors.edit",
        name: "Edit Vendor",
        description: "Edit vendor information",
      },
      {
        key: "vendors.delete",
        name: "Delete Vendor",
        description: "Delete vendor accounts",
      },

      // Orders Management
      {
        key: "orders.view",
        name: "View Orders",
        description: "View orders list and order details",
      },
      {
        key: "orders.edit",
        name: "Edit Orders",
        description: "Update order status and details",
      },
      {
        key: "orders.cancel",
        name: "Cancel Orders",
        description: "Cancel or reject orders",
      },

      // Transactions
      {
        key: "transactions.view",
        name: "View Transactions",
        description: "View payment and transaction history",
      },
      {
        key: "transactions.refund",
        name: "Refund Transactions",
        description: "Initiate refunds for transactions",
      },

      // Verification (KYC / Approval)
      {
        key: "verification.view",
        name: "View Verifications",
        description: "View verification requests",
      },
      {
        key: "verification.approve",
        name: "Approve Verification",
        description: "Approve buyer/vendor verification",
      },
      {
        key: "verification.reject",
        name: "Reject Verification",
        description: "Reject buyer/vendor verification",
      },

      // Permissions & Roles
      {
        key: "permissions.view",
        name: "View Permissions",
        description: "View roles and permission list",
      },
      {
        key: "permissions.assign",
        name: "Assign Permissions",
        description: "Assign permissions to users or roles",
      },
      {
        key: "permissions.manage",
        name: "Manage Permissions",
        description: "Create, update, or delete permissions",
      },

      // Settings
      {
        key: "settings.view",
        name: "View Settings",
        description: "View system and application settings",
      },
      {
        key: "settings.update",
        name: "Update Settings",
        description: "Update system and application settings",
      },

      // Chats / Messaging
      {
        key: "chats.view",
        name: "View Chats",
        description: "View user chats and conversations",
      },
      {
        key: "chats.send",
        name: "Send Messages",
        description: "Send messages to users",
      },
      {
        key: "chats.moderate",
        name: "Moderate Chats",
        description: "Monitor or moderate chat messages",
      },

      // Notifications
      {
        key: "notifications.view",
        name: "View Notifications",
        description: "View system and user notifications",
      },
      {
        key: "notifications.send",
        name: "Send Notifications",
        description: "Send notifications to users",
      },

      // Account (Admin / Employee Account)
      {
        key: "account.view",
        name: "View Account",
        description: "View own account details",
      },
      {
        key: "account.update",
        name: "Update Account",
        description: "Update own account information",
      },
      {
        key: "account.password.change",
        name: "Change Password",
        description: "Change account password",
      },
    ];

    const created: any[] = [];
    for (const permission of permissions) {
      const existing = await this.prisma.permission.findUnique({
        where: { key: permission.key },
      });

      if (!existing) {
        const created_permission = await this.prisma.permission.create({
          data: permission,
        });
        created.push(created_permission);
      }
    }

    return {
      success: true,
      message: `${created.length} permissions seeded successfully`,
      permissions: created,
    };
  }

  // ==================== TOKEN MANAGEMENT ====================

  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      userType: user.userType,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get("JWT_ACCESS_SECRET") || "bangladesh_1971",
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
    const user = await this.prisma.user.findUnique({
      where: { email: forgotPasswordDto.email },
    });

    if (!user) {
      throw new NotFoundException("User with this email does not exist");
    }

    await this.prisma.passwordResetOtp.deleteMany({
      where: { email: forgotPasswordDto.email },
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.passwordResetOtp.create({
      data: {
        email: forgotPasswordDto.email,
        otp,
        expiresAt,
        verified: false,
      },
    });

    await this.emailService.sendOtpEmail(forgotPasswordDto.email, otp);

    return {
      success: true,
      message: "OTP sent to your email successfully",
      email: forgotPasswordDto.email,
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
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

    if (new Date() > otpRecord.expiresAt) {
      await this.prisma.passwordResetOtp.delete({
        where: { id: otpRecord.id },
      });
      throw new BadRequestException(
        "OTP has expired. Please request a new one",
      );
    }

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

    if (new Date() > otpRecord.expiresAt) {
      await this.prisma.passwordResetOtp.delete({
        where: { id: otpRecord.id },
      });
      throw new BadRequestException(
        "OTP has expired. Please request a new one",
      );
    }

    if (!otpRecord.verified) {
      throw new BadRequestException(
        "OTP not verified. Please verify OTP first",
      );
    }

    if (resetPasswordDto.newPassword !== resetPasswordDto.confirmPassword) {
      throw new BadRequestException("Passwords do not match");
    }

    const passwordHash = await bcrypt.hash(resetPasswordDto.newPassword, 10);

    await this.prisma.user.update({
      where: { email: resetPasswordDto.email },
      data: { passwordHash },
    });

    await this.prisma.passwordResetOtp.deleteMany({
      where: { email: resetPasswordDto.email },
    });

    return {
      success: true,
      message:
        "Password reset successfully. You can now login with your new password",
    };
  }

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

  // ==================== OTHER METHODS (TESTING) ====================

  private generateVendorCode(): string {
    const randomPart = uuidv4().substring(0, 8).toUpperCase();
    return `VENDOR-${randomPart}`;
  }

  async getAllVendor() {
    return await this.prisma.vendor.findMany({});
  }
  async getProfile({
    email,
    id,
    userType,
  }: {
    id: string;
    email: string;
    userType: "vendor" | "buyer" | "user";
  }) {
    if (userType === "buyer") {
      return await this.prisma.user.findUnique({
        where: {
          id,
          userType,
        },
        include: {
          buyer: true,
        },
      });
    } else if (userType === "vendor") {
      return await this.prisma.user.findUnique({
        where: {
          id,
        },
        include: {
          vendor: true,
        },
      });
    }
    return await this.prisma.vendor.findMany({});
  }
  // Service
  // Service - Fixed updateProfile method
  async updateProfile(
    {
      email,
      id,
      userType,
    }: {
      id: string;
      email: string;
      userType: "vendor" | "buyer" | "user";
    },
    updateDto: UpdateProfileDto,
  ) {
    // Extract user-level updates and profile-specific updates
    const {
      user: userUpdate,
      buyer: buyerUpdate,
      vendor: vendorUpdate,
    } = updateDto;

    if (userType === "buyer") {
      // Find the user with buyer relation
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: { buyer: true },
      });

      if (!user || !user.buyer) {
        throw new NotFoundException("Buyer profile not found");
      }

      // Update user table if there are user-level updates
      if (userUpdate && Object.keys(userUpdate).length > 0) {
        await this.prisma.user.update({
          where: { id },
          data: userUpdate,
        });
      }

      // Update buyer profile if there are buyer-specific updates
      if (buyerUpdate && Object.keys(buyerUpdate).length > 0) {
        await this.prisma.buyer.update({
          where: { id: user.buyer.id },
          data: buyerUpdate,
        });
      }

      // Return updated user with buyer relation
      return await this.prisma.user.findUnique({
        where: { id },
        include: { buyer: true },
      });
    } else if (userType === "vendor") {
      // Find the user with vendor relation
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: { vendor: true },
      });

      if (!user || !user.vendor) {
        throw new NotFoundException("Vendor profile not found");
      }

      // Update user table if there are user-level updates
      if (userUpdate && Object.keys(userUpdate).length > 0) {
        await this.prisma.user.update({
          where: { id },
          data: userUpdate,
        });
      }

      // Update vendor profile if there are vendor-specific updates
      if (vendorUpdate && Object.keys(vendorUpdate).length > 0) {
        await this.prisma.vendor.update({
          where: { id: user.vendor.id },
          data: vendorUpdate,
        });
      }

      // Return updated user with vendor relation
      return await this.prisma.user.findUnique({
        where: { id },
        include: { vendor: true },
      });
    }

    throw new BadRequestException("Invalid user type");
  }
  async getAllBuyer() {
    return await this.prisma.buyer.findMany({});
  }

  // Service
  async getAlluser(query: GetAllUsersQueryDto) {
    const {
      page = 1,
      limit = 10,
      userType,
      search,
      gender,
      isActive,
      vendorCode,
      sortBy = "createdAt",
      sortOrder = "desc",
      includeMessages = false,
      includeNotifications = false,
      includeCount = true,
    } = query;

    const skip = (page - 1) * limit;
    const take = limit;

    // ... (keep the where clause building same as before)

    const where: any = {};

    if (userType) {
      where.userType = userType;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        {
          buyer: {
            fulllName: { contains: search, mode: "insensitive" },
          },
        },
        {
          vendor: {
            fulllName: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    if (vendorCode) {
      where.vendor = {
        vendorCode: { contains: vendorCode, mode: "insensitive" },
      };
    }

    if (gender) {
      where.OR = [{ buyer: { gender } }, { vendor: { gender } }];
    }

    if (isActive !== undefined) {
      where.vendor = {
        ...where.vendor,
        isActive,
      };
    }

    const include: any = {
      buyer: {
        select: {
          id: true,
          userId: true,
          fulllName: true,
          phone: true,
          nidNumber: true,
          // nidFontPhotoUrl: true,
          profilePhotoUrl: true,
          createdAt: true,
          updatedAt: true,
          gender: true,
          orders: {
            select: {
              id: true,
              totalAmount: true,
              status: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              orders: true,
              messages: true,
              couponAssignments: true,
              connections: true,
            },
          },
        },
      },
      vendor: {
        select: {
          id: true,
          userId: true,
          vendorCode: true,
          fulllName: true,
          phone: true,
          address: true,
          storename: true,
          storeDescription: true,
          gender: true,
          businessName: true,
          businessDescription: true,
          logoUrl: true,
          nationalIdNumber: true,
          nidFontPhotoUrl: false,
          bussinessRegNumber: true,
          bussinessIdPhotoUrl: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          orders: {
            select: {
              id: true,
              totalAmount: true,
              status: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              orders: true,
              products: true,
              categories: true,
              coupons: true,
              messages: true,
              connections: true,
            },
          },
        },
      },
    };

    if (includeMessages) {
      include.receivedMessages = {
        take: 10,
        orderBy: { createdAt: "desc" },
      };
      include.sentMessages = {
        take: 10,
        orderBy: { createdAt: "desc" },
      };
    }

    if (includeNotifications) {
      include.notifications = {
        take: 10,
        orderBy: { createdAt: "desc" },
      };
    }

    if (includeCount) {
      include._count = true;
    }

    const [rawUsers, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include,
        skip,
        take,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Transform users to include order statistics
    const usersWithStats = rawUsers.map((user) => {
      // Create base user object
      const { buyer, vendor, ...baseUser } = user;

      const result: any = { ...baseUser };

      // Handle buyer stats
      if (buyer) {
        const buyerOrders = (buyer as any).orders || [];
        const totalOrderCount = buyerOrders.length;
        const totalOrderAmount = buyerOrders.reduce(
          (sum: number, order: any) => sum + (Number(order.totalAmount) || 0),
          0,
        );
        const ordersByStatus = buyerOrders.reduce((acc: any, order: any) => {
          const status = order.status || "unknown";
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});

        const { orders, ...buyerWithoutOrders } = buyer as any;
        result.buyer = {
          ...buyerWithoutOrders,
          orderStats: {
            totalCount: totalOrderCount,
            totalAmount: totalOrderAmount,
            byStatus: ordersByStatus,
          },
        };
      } else {
        result.buyer = null;
      }

      // Handle vendor stats
      // Handle vendor stats
      if (vendor) {
        const vendorOrders = (vendor as any).orders || [];
        const totalOrderCount = vendorOrders.length;
        const totalOrderAmount = vendorOrders.reduce(
          (sum: number, order: any) => sum + (Number(order.totalAmount) || 0),
          0,
        );
        const ordersByStatus = vendorOrders.reduce((acc: any, order: any) => {
          const status = order.status || "unknown";
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});

        // Calculate revenue from delivered orders only
        const deliveredOrders = vendorOrders.filter(
          (order: any) => order.status === ordersByStatus.DELIVERED,
        );
        const revenue = deliveredOrders.reduce(
          (sum: number, order: any) => sum + (Number(order.totalAmount) || 0),
          0,
        );

        const { orders, ...vendorWithoutOrders } = vendor as any;
        result.vendor = {
          ...vendorWithoutOrders,
          orderStats: {
            totalCount: totalOrderCount,
            totalAmount: totalOrderAmount,
            byStatus: ordersByStatus,
          },
          revenue: revenue, // Revenue from delivered orders only
        };
      } else {
        result.vendor = null;
      }

      return result;
    });

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      data: usersWithStats,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    };
  }

  async getAllAdminUser() {
    return await this.prisma.admin.findMany({});
  }

  async getAllVendors(query: GetAllVendorsQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      vendorCode,
      gender,
      isActive,
      sortBy = VendorSortBy.CREATED_AT,
      sortOrder = "desc",
      minRevenue,
      maxRevenue,
      minRating,
      maxRating,
      businessName,
    } = query;

    const skip = (page - 1) * limit;
    const take = limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { fulllName: { contains: search, mode: "insensitive" } },
        { storename: { contains: search, mode: "insensitive" } },
        { businessName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
      ];
    }

    if (vendorCode) {
      where.vendorCode = { contains: vendorCode, mode: "insensitive" };
    }

    if (gender) {
      where.gender = gender;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (businessName) {
      where.businessName = { contains: businessName, mode: "insensitive" };
    }

    // Fetch vendors with all required data
    const [rawVendors, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where,
        include: {
          orders: {
            select: {
              id: true,
              totalAmount: true,
              status: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              orders: true,
              products: true,
              categories: true,
              coupons: true,
              messages: true,
              connections: true,
            },
          },
        },
        skip,
        take: take * 2, // Fetch more for filtering
      }),
      this.prisma.vendor.count({ where }),
    ]);

    // Transform vendors and calculate stats
    const vendorsWithStats = rawVendors.map((vendor) => {
      const { orders, ...vendorData } = vendor;

      // Calculate revenue (from delivered orders only)
      const deliveredOrders = orders.filter(
        (order) => order.status === OrderStatus.DELIVERED,
      );
      const revenue = deliveredOrders.reduce(
        (sum, order) => sum + Number(order.totalAmount),
        0,
      );

      // Calculate total orders
      const totalOrders = orders.length;

      // Calculate order statistics by status
      const ordersByStatus = orders.reduce(
        (acc, order) => {
          const status = order.status || "unknown";
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      // TODO: Implement rating calculation
      // This depends on your rating system - could be from reviews, feedback, etc.
      // For now, using a placeholder. You'll need to add a Review/Rating model
      const rating = 0; // Placeholder - implement based on your rating system

      return {
        id: vendorData.id,
        userId: vendorData.userId,
        vendorCode: vendorData.vendorCode,
        fulllName: vendorData.fulllName,
        phone: vendorData.phone,
        address: vendorData.address,
        storename: vendorData.storename,
        storeDescription: vendorData.storeDescription,
        gender: vendorData.gender,
        businessName: vendorData.businessName,
        businessDescription: vendorData.businessDescription,
        logoUrl: vendorData.logoUrl,
        isActive: vendorData.isActive,
        createdAt: vendorData.createdAt,
        updatedAt: vendorData.updatedAt,
        revenue: revenue,
        rating: rating,
        totalOrders: totalOrders,
        orderStats: {
          totalCount: totalOrders,
          byStatus: ordersByStatus,
        },
        counts: vendorData._count,
      };
    });

    // Apply revenue filters
    let filteredVendors = vendorsWithStats;
    if (minRevenue !== undefined) {
      filteredVendors = filteredVendors.filter((v) => v.revenue >= minRevenue);
    }
    if (maxRevenue !== undefined) {
      filteredVendors = filteredVendors.filter((v) => v.revenue <= maxRevenue);
    }

    // Apply rating filters
    if (minRating !== undefined) {
      filteredVendors = filteredVendors.filter((v) => v.rating >= minRating);
    }
    if (maxRating !== undefined) {
      filteredVendors = filteredVendors.filter((v) => v.rating <= maxRating);
    }

    // Sort vendors
    filteredVendors.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case VendorSortBy.REVENUE:
          aValue = a.revenue;
          bValue = b.revenue;
          break;
        case VendorSortBy.RATING:
          aValue = a.rating;
          bValue = b.rating;
          break;
        case VendorSortBy.TOTAL_ORDERS:
          aValue = a.totalOrders;
          bValue = b.totalOrders;
          break;
        case VendorSortBy.FULL_NAME:
          aValue = a.fulllName;
          bValue = b.fulllName;
          break;
        case VendorSortBy.STORE_NAME:
          aValue = a.storename;
          bValue = b.storename;
          break;
        case VendorSortBy.CREATED_AT:
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    // Apply pagination to filtered results
    const paginatedVendors = filteredVendors.slice(0, take);
    const filteredTotal = filteredVendors.length;

    const totalPages = Math.ceil(filteredTotal / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      data: paginatedVendors,
      meta: {
        total: filteredTotal,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    };
  }
}
