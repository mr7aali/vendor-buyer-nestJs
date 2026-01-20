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
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { GetUser } from "./decorators/get-user.decorator";
import { UserRegisterDto } from "./dto/user-create.dto";
import { BuyerRegisterFullDto } from "./dto/buyer-register-full.dto";
import { VendorRegisterDto } from "./dto/vendor-register.dto";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
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

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ==================== USER REGISTRATION ====================

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async registerUser(@Body() body: UserRegisterDto) {
    return this.authService.registerUser(body);
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

  // ==================== FORGOT PASSWORD FLOW ====================

  /**
   * Step 1: Request OTP for password reset
   * Send OTP to user's email
   */
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  /**
   * Step 2: Verify OTP sent to email
   * Optional but recommended step before resetting password
   */
  @Post("verify-otp")
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  /**
   * Step 3: Reset password with verified OTP
   * User must provide email, OTP, new password and confirm password
   */
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  // ==================== PROFILE & USERS ====================

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getProfile(@GetUser() user: any) {
    return user;
  }

  @Get("all-vendor")
  async getAllVendor() {
    return this.authService.getAllVendor();
  }

  @Get("all-buyer")
  async getAllBuyer() {
    return this.authService.getAllBuyer();
  }

  @Get("user")
  async getAlluser() {
    return this.authService.getAlluser();
  }
}
