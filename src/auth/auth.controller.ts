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
// import { VendorRegisterDto } from "./dto/buyer-register.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async registerUser(@Body() body: UserRegisterDto) {
    const data = body;
    return this.authService.registerUser(data);
  }

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
  // async registerVendor(@Body() body: VendorRegisterDto, @GetUser() user: any) {
  //   const userId = user.id as string;
  //   return this.authService.registerVendor({
  //     data: body,
  //     userId: userId,
  //   });
  // }
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

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

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

{
}
