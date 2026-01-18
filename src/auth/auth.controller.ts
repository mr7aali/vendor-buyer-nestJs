import { Controller, Post, Body, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, UserType } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VendorRegisterDto } from './dto/vendor-register.dto';
import { BuyerRegisterDto } from './dto/buyer-register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class VendorRegisterFullDto extends RegisterDto {
  @ApiProperty({ example: 'ABC Store' })
  businessName: string;

  @ApiPropertyOptional({ example: 'A premium store for quality products' })
  businessDescription?: string;

  @ApiPropertyOptional({ example: '123 Main St, City, State, ZIP' })
  businessAddress?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  logoUrl?: string;
}

class BuyerRegisterFullDto extends RegisterDto {
  @ApiPropertyOptional({ example: '123 Main Street' })
  shippingAddress?: string;

  @ApiPropertyOptional({ example: 'New York' })
  city?: string;

  @ApiPropertyOptional({ example: '10001' })
  postalCode?: string;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/vendor')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register as a vendor', description: 'Create a new vendor account with business information' })
  @ApiResponse({ status: 201, description: 'Vendor successfully registered', schema: { example: { accessToken: 'jwt-token', user: {} } } })
  @ApiResponse({ status: 409, description: 'User with this email already exists' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiBody({ type: VendorRegisterFullDto })
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

  @Post('register/buyer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register as a buyer', description: 'Create a new buyer account' })
  @ApiResponse({ status: 201, description: 'Buyer successfully registered', schema: { example: { accessToken: 'jwt-token', user: {} } } })
  @ApiResponse({ status: 409, description: 'User with this email already exists' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiBody({ type: BuyerRegisterFullDto })
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
    return this.authService.register(registerDto, buyerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login', description: 'Authenticate user and receive JWT token' })
  @ApiResponse({ status: 200, description: 'Login successful', schema: { example: { accessToken: 'jwt-token', user: {} } } })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiBody({ type: LoginDto })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile', description: 'Get authenticated user information' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getProfile(@GetUser() user: any) {
    return user;
  }
}
