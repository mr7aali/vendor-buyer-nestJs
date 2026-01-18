import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VendorRegisterDto } from './dto/vendor-register.dto';
import { BuyerRegisterDto } from './dto/buyer-register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';

class VendorRegisterFullDto extends RegisterDto {
  businessName: string;
  businessDescription?: string;
  businessAddress?: string;
  logoUrl?: string;
}

class BuyerRegisterFullDto extends RegisterDto {
  shippingAddress?: string;
  city?: string;
  postalCode?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/vendor')
  async registerVendor(@Body() body: VendorRegisterFullDto) {
    const registerDto: RegisterDto = {
      email: body.email,
      password: body.password,
      userType: 'vendor',
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

  @Post('register/buyer')
  async registerBuyer(@Body() body: BuyerRegisterFullDto) {
    const registerDto: RegisterDto = {
      email: body.email,
      password: body.password,
      userType: 'buyer',
      fullName: body.fullName,
      phone: body.phone,
    };
    const buyerDto: BuyerRegisterDto = {
      shippingAddress: body.shippingAddress,
      city: body.city,
      postalCode: body.postalCode,
    };
    return this.authService.register(registerDto, buyerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@GetUser() user: any) {
    return user;
  }
}
