import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConnectVendorDto {
  @ApiProperty({
    description: 'Vendor code (unique code provided by vendor)',
    example: 'VENDOR123',
  })
  @IsString()
  @IsNotEmpty()
  vendorCode: string;
}
