import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";

import { AuthService } from "./auth.service";
import { RegisterDto, UserType } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { VendorRegisterDto } from "./dto/vendor-register.dto";
import { BuyerRegisterDto } from "./dto/buyer-register.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { GetUser } from "./decorators/get-user.decorator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserRegisterDto } from "./dto/user-create.dto";

class VendorRegisterFullDto extends RegisterDto {
  @ApiProperty({ example: "ABC Store" })
  businessName: string;

  @ApiPropertyOptional({ example: "A premium store for quality products" })
  businessDescription?: string;

  @ApiPropertyOptional({ example: "123 Main St, City, State, ZIP" })
  businessAddress?: string;

  @ApiPropertyOptional({ example: "https://example.com/logo.png" })
  logoUrl?: string;
}

class BuyerRegisterFullDto extends RegisterDto {
  @ApiPropertyOptional({ example: "123 Main Street" })
  shippingAddress?: string;

  @ApiPropertyOptional({ example: "New York" })
  city?: string;

  @ApiPropertyOptional({ example: "10001" })
  postalCode?: string;
}

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
  @HttpCode(HttpStatus.CREATED)
  async registerVendor(@Body() body: VendorRegisterFullDto) {
    const registerDto: RegisterDto = {
      email: body.email,
      password: body.password,
      userType: UserType.VENDOR,
      fullName: body.fullName,
      phone: body.phone,
    };
    const vendorDto: VendorRegisterDto = {
      businessName: body.businessName,
      businessDescription: body.businessDescription,
      businessAddress: body.businessAddress,
      logoUrl: body.logoUrl,
    };
    return this.authService.register(registerDto, vendorDto);
  }

  @Post("register/buyer")
  @HttpCode(HttpStatus.CREATED)
  async registerBuyer(@Body() body: BuyerRegisterFullDto) {
    const registerDto: RegisterDto = {
      email: body.email,
      password: body.password,
      userType: UserType.BUYER,
      fullName: body.fullName,
      phone: body.phone,
    };
    const buyerDto: BuyerRegisterDto = {
      shippingAddress: body.shippingAddress,
      city: body.city,
      postalCode: body.postalCode,
    };
    console.log(registerDto, buyerDto);
    return this.authService.register(registerDto, buyerDto);
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
}
