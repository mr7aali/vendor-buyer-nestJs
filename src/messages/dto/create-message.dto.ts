import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class CreateMessageDto {
  @IsUUID()
  @IsNotEmpty()
  receiverId: string;

  @IsString()
  @IsNotEmpty()
  messageText: string;
}
