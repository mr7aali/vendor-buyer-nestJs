import { IsOptional, IsString } from "class-validator";

export class GetExploreVendorsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
