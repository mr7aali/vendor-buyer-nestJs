import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class FcmTokenDto {
    @ApiProperty({
        description: 'FCM device registration token from the mobile/web client',
        example: 'fE8k2m3...',
    })
    @IsString()
    @IsNotEmpty()
    token: string;
}
