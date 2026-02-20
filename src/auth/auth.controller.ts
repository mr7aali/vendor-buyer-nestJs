import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  Param,
  ParseIntPipe,
  Delete,
  Patch,
  Query,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { GetUser } from "./decorators/get-user.decorator";
import { UserRegisterDto } from "./dto/user-create.dto";
import { BuyerRegisterFullDto } from "./dto/buyer-register-full.dto";
import { VendorRegisterDto } from "./dto/vendor-register.dto";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from "./dto/forgot-password";
import { AdminLoginDto } from "./dto/admin-login.dto";
import { Permissions } from "./decorators/permissions.decorator";
import { PermissionGuard } from "./guards/permission.guard";
import { CreateSuperAdminDto } from "./dto/create-super-admin.dto";
import { AdminAuthGuard } from "./guards/admin-auth.guard";
import {
  CreateEmployeeDto,
  UpdateEmployeePermissionsDto,
} from "./dto/Employee.dto";
import type {
  UpdateProfileDto,
  UpdateVendorProfileDto,
} from "./dto/update.dto";
import { GetAllUsersQueryDto } from "./dto/getall.query.dto";
import { GetAllVendorsQueryDto } from "./dto/getAllVendors";
import { UpdateVendorDto } from "./dto/update-vendor.dto";
import { UpdateAdminProfileDto } from "./dto/update-admin-profile.dto";
import { ChangeAdminPasswordDto } from "./dto/change-admin-password.dto";
import { UpdateBuyerDto } from "./dto/update-buyer.dto";
// import { UpdateProfileDto } from "./dto/update.dto";
// import { CreateEmployeeDto } from "./dto/create-employee.dto";
// import { UpdateEmployeePermissionsDto } from "./dto/update-employee-permissions.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ==================== USER REGISTRATION ====================

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async registerUser(@Body() body: UserRegisterDto) {
    return this.authService.registerUser(body);
  }

  @Get("admin/users/:id")
  @UseGuards(AdminAuthGuard)
  async getUserByIdForAdmin(@Param("id") id: string) {
    return this.authService.getUserByIdForAdmin(id);
  }

  // ==================== VENDOR REGISTRATION ====================

  @Post("register/vendor")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "logo", maxCount: 1 },
      { name: "nidFront", maxCount: 1 },
      { name: "nidBack", maxCount: 1 },
      { name: "businessId", maxCount: 1 },
    ]),
  )
  async registerVendor(
    @Body() body: VendorRegisterDto,
    @UploadedFiles()
    files: {
      logo?: Express.Multer.File[];
      nidFront?: Express.Multer.File[];
      nidBack?: Express.Multer.File[];
      businessId?: Express.Multer.File[];
    },
    @GetUser() user: any,
  ) {
    const userId = user.id as string;
    return this.authService.registerVendor({
      data: body,
      userId: userId,
      files: files,
    });
  }

  @Get("vendor/:id")
  @UseGuards(AdminAuthGuard)
  async getVendorById(@Param("id") id: string) {
    return this.authService.getVendorById(id);
  }
  @Patch("vendor/:id")
  @UseGuards(AdminAuthGuard)
  async updateVendor(
    @Param("id") id: string,
    @Body() updateDto: UpdateVendorDto,
  ) {
    return this.authService.updateVendor(id, updateDto);
  }
  @Patch("buyer/:id")
  @UseGuards(AdminAuthGuard)
  async updateBuyer(
    @Param("id") id: string,
    @Body() updateDto: UpdateBuyerDto,
  ) {
    return this.authService.updateBuyer(id, updateDto);
  }
  // ==================== BUYER REGISTRATION ====================
  @Post("register/buyer")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "nidFontPhotoUrl", maxCount: 1 },
      { name: "nidBackPhotoUrl", maxCount: 1 },
      { name: "profilePhotoUrl", maxCount: 1 },
    ]),
  )
  async registerBuyer(
    @Body() body: BuyerRegisterFullDto,
    @GetUser() user: any,
    @UploadedFiles()
    files: {
      nidFontPhotoUrl?: Express.Multer.File[];
      nidBackPhotoUrl?: Express.Multer.File[];
      profilePhotoUrl?: Express.Multer.File[];
    },
  ) {
    const userId = user.id as string;
    return this.authService.registerBuyer({
      data: body,
      userId: userId,
      files,
    });
  }

  // ==================== LOGIN ====================

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post("admin/login")
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Body("refreshToken") refreshToken: string) {
    return this.authService.refreshTokens(refreshToken);
  }

  // ==================== ADMIN DASHBOARD MANAGEMENT ====================

  /**
   * Get current admin profile
   */
  @Get("admin/me")
  @UseGuards(AdminAuthGuard)
  getAdminProfile(@GetUser() admin: any) {
    // return admin;
    return this.authService.getAdminProfile(admin.id);
  }
  @Patch("admin-profile-update")
  @UseGuards(AdminAuthGuard)
  @UseInterceptors(FileInterceptor("avatar"))
  async updateAdminProfile(
    @GetUser() admin: any,
    @Body() dto: UpdateAdminProfileDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.authService.updateAdminProfile(admin.id, dto, avatar);
  }
  @Patch("change-admin-password")
  @UseGuards(AdminAuthGuard)
  async changeAdminPassword(
    @GetUser() admin: any,
    @Body() dto: ChangeAdminPasswordDto,
  ) {
    return this.authService.changeAdminPassword(admin.id, dto);
  }

  @Get("admin/pending-buyers")
  @UseGuards(AdminAuthGuard)
  async getPendingBuyers() {
    return this.authService.getPendingBuyers();
  }

  @Get("admin/pending-vendors")
  @UseGuards(AdminAuthGuard)
  async getPendingVendors() {
    return this.authService.getPendingVendors();
  }

  /**
   * Bootstrap super admin (one-time setup)
   */
  @Post("admin/bootstrap")
  @HttpCode(HttpStatus.CREATED)
  async bootstrapSuperAdmin(@Body() dto: CreateSuperAdminDto) {
    return this.authService.createSuperAdmin(dto);
  }

  /**
   * Create a new employee/admin
   * Only SUPER_ADMIN can create employees
   */
  @Post("admin/employee")
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions("admin.create")
  @HttpCode(HttpStatus.CREATED)
  async createEmployee(@Body() dto: CreateEmployeeDto) {
    return this.authService.createEmployee(dto);
  }

  /**
   * Get all employees/admins
   */
  @Get("admin/employees")
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions("admin.view")
  async getAllEmployees() {
    return this.authService.getAllEmployees();
  }

  /**
   * Get a specific employee by ID
   */
  @Get("admin/employee/:employeeId")
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions("admin.view")
  async getEmployee(@Param("employeeId", ParseIntPipe) employeeId: number) {
    return this.authService.getEmployeeById(employeeId);
  }

  /**
   * Update employee permissions
   * Assign or revoke specific page access permissions
   */
  @Patch("admin/employee/:employeeId/permissions")
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions("admin.permission.assign")
  async updateEmployeePermissions(
    @Param("employeeId", ParseIntPipe) employeeId: number,
    @Body() dto: UpdateEmployeePermissionsDto,
  ) {
    return this.authService.updateEmployeePermissions(
      employeeId,
      dto.permissions,
    );
  }

  /**
   * Delete an employee
   */
  @Delete("admin/employee/:employeeId")
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions("admin.delete")
  async deleteEmployee(@Param("employeeId", ParseIntPipe) employeeId: number) {
    return this.authService.deleteEmployee(employeeId);
  }

  /**
   * Get all available permissions
   */
  @Get("admin/permissions")
  @UseGuards(AdminAuthGuard)
  async getAllPermissions() {
    return this.authService.getAllPermissions();
  }

  /**
   * Seed initial permissions (development only)
   */
  @Post("admin/permissions/seed")
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions("admin.permission.seed")
  async seedPermissions() {
    return this.authService.seedPermissions();
  }

  // ==================== EXAMPLE PROTECTED ROUTES ====================

  @Get("admin/dashboard")
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions("dashboard.view")
  getDashboard() {
    return { message: "Dashboard access granted", success: true };
  }

  @Get("admin/users")
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions("users.view")
  getUsersPage() {
    return { message: "Users page access granted", success: true };
  }

  @Get("admin/products")
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions("products.view")
  getProductsPage() {
    return { message: "Products page access granted", success: true };
  }

  @Get("admin/orders")
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions("orders.view")
  getOrdersPage() {
    return { message: "Orders page access granted", success: true };
  }

  @Get("admin/reports")
  @UseGuards(AdminAuthGuard, PermissionGuard)
  @Permissions("reports.view")
  getReportsPage() {
    return { message: "Reports page access granted", success: true };
  }

  // ==================== FORGOT PASSWORD FLOW ====================

  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post("admin/forgot-password")
  @HttpCode(HttpStatus.OK)
  async adminForgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.adminForgotPassword(forgotPasswordDto);
  }

  @Post("verify-otp")
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post("admin/reset-password")
  @HttpCode(HttpStatus.OK)
  async adminResetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.adminResetPassword(resetPasswordDto);
  }

  // ==================== PROFILE & USERS ====================

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getProfile(
    @GetUser()
    user: {
      id: string;
      email: string;
      userType: "vendor" | "buyer" | "user";
    },
  ) {
    return this.authService.getProfile(user);
  }
  // Controller
  @Patch("me")
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @GetUser()
    user: {
      id: string;
      email: string;
      userType: "vendor" | "buyer" | "user";
    },
    @Body() updateDto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user, updateDto);
  }

  // @Get("all-vendor")
  // async getAllVendor() {
  //   return this.authService.getAllVendor();
  // }
  @UseGuards(AdminAuthGuard)
  @Get("all-buyer")
  async getAllBuyer() {
    return this.authService.getAllBuyer();
  }
  // Controller
  @UseGuards(AdminAuthGuard)
  @Get("user")
  async getAlluser(@Query() query: GetAllUsersQueryDto) {
    return this.authService.getAlluser(query);
  }
  @Get("admin")
  async getAllAdminUser() {
    return this.authService.getAllAdminUser();
  }
  @UseGuards(AdminAuthGuard)
  @Get("all-vendor")
  async getAllVendors(@Query() query: GetAllVendorsQueryDto) {
    console.log(query);
    return this.authService.getAllVendors(query);
  }
  @UseGuards(JwtAuthGuard)
  @Get("user-vendor-statistics")
  async getUserVendorStatistics(
    @GetUser()
    user: {
      id: string;
      email: string;
      userType: "vendor" | "buyer" | "user";
    },
  ) {
    return this.authService.getUserVendorStatistics(user);
  }
}
