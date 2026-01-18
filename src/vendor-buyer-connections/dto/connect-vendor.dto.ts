import { IsString, IsNotEmpty } from 'class-validator';

export class ConnectVendorDto {
  @IsString()
  @IsNotEmpty()
  vendorCode: string;
}
