import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  NotFoundException,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from "@nestjs/common";
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { UserType } from "../auth/dto/register.dto";
import { PrismaService } from "../prisma/prisma.service";
import { FileFieldsInterceptor } from "@nestjs/platform-express";

// @ApiTags("Categories")
// @ApiBearerAuth("JWT-auth")
@Controller("categories")
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly prisma: PrismaService,
  ) {}
  @Post()
  @Roles(UserType.VENDOR)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileFieldsInterceptor([{ name: "catImage", maxCount: 1 }]))
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
    @GetUser() user: any,
    @UploadedFiles()
    files: {
      catImage?: Express.Multer.File[];
    },
  ) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
    });
    if (!vendor) {
      throw new NotFoundException("Vendor profile not found.");
    }
    return this.categoriesService.create({
      vendorId: vendor.id,
      createCategoryDto,
      files,
    });
  }

  @Get("vendor/:vendorId")
  async findAllForVendor(
    @Param("vendorId") vendorId: string,
    @GetUser() user: any,
  ) {
    if (user.userType === "vendor") {
      const vendor = await this.prisma.vendor.findUnique({
        where: { userId: user.id },
      });
      if (vendor?.id !== vendorId) {
        throw new NotFoundException("Vendor not found");
      }
      return this.categoriesService.findAllByVendor(vendorId);
    } else if (user.userType === "buyer") {
      const buyer = await this.prisma.buyer.findUnique({
        where: { userId: user.id },
      });
      if (!buyer) {
        throw new NotFoundException("Buyer profile not found");
      }
      return this.categoriesService.getCategoriesForBuyer(buyer.id, vendorId);
    }
  }

  @Get("all")
  async findAll() {
    return this.categoriesService.findAll();
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @GetUser() user: any) {
    let vendorId: string;
    if (user.userType === "vendor") {
      const vendor = await this.prisma.vendor.findUnique({
        where: { userId: user.id },
      });
      if (!vendor) {
        throw new NotFoundException("Vendor profile not found");
      }
      vendorId = vendor.id;
    } else {
      // For buyers, we need to get vendor from category
      const category = await this.prisma.category.findUnique({
        where: { id },
      });
      if (!category) {
        throw new NotFoundException("Category not found");
      }
      vendorId = category.vendorId;
      const buyer = await this.prisma.buyer.findUnique({
        where: { userId: user.id },
      });
      if (!buyer) {
        throw new NotFoundException("Buyer profile not found");
      }
      // Check connection
      await this.categoriesService.getCategoriesForBuyer(buyer.id, vendorId);
    }
    return this.categoriesService.findOne(id, vendorId);
  }

  @Patch(":id")
  @Roles(UserType.VENDOR)
  @UseGuards(RolesGuard)
  async update(
    @Param("id") id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @GetUser() user: any,
  ) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
    });
    if (!vendor) {
      throw new NotFoundException("Vendor profile not found");
    }
    return this.categoriesService.update(id, vendor.id, updateCategoryDto);
  }

  @Delete(":id")
  @Roles(UserType.VENDOR)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  async remove(@Param("id") id: string, @GetUser() user: any) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
    });
    if (!vendor) {
      throw new NotFoundException("Vendor profile not found");
    }
    return this.categoriesService.remove(id, vendor.id);
  }
}
