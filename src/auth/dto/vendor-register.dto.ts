// import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
// import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// export class VendorRegisterDto {
//   @ApiProperty({
//     description: 'Business name',
//     example: 'ABC Store',
//   })
//   @IsString()
//   @IsNotEmpty()
//   businessName: string;

//   @ApiPropertyOptional({
//     description: 'Business description',
//     example: 'A premium store for quality products',
//   })
//   @IsString()
//   @IsOptional()
//   businessDescription?: string;

//   @ApiPropertyOptional({
//     description: 'Business address',
//     example: '123 Main St, City, State, ZIP',
//   })
//   @IsString()
//   @IsOptional()
//   businessAddress?: string;

//   @ApiPropertyOptional({
//     description: 'Logo URL',
//     example: 'https://example.com/logo.png',
//     format: 'uri',
//   })
//   @IsString()
//   @IsOptional()
//   logoUrl?: string;
// }
