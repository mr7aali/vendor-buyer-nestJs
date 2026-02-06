import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateAdminChatMessageDto {
  @ApiProperty({
    description: "Message text content",
    example: "Hello! How can I help you today?",
  })
  @IsString()
  @IsNotEmpty()
  messageText: string;
}
