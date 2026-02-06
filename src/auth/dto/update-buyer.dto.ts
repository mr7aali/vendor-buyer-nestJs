import { IsString, IsOptional, IsBoolean } from "class-validator";

export class UpdateBuyerDto {
  @IsOptional()
  @IsString()
  fulllName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  nidNumber?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsBoolean()
  isNidVerify?: boolean;
}
