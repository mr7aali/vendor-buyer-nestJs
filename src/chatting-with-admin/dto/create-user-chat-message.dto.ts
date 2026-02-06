import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateUserChatMessageDto {
  @ApiProperty({
    description: "Message text content",
    example: "Hi Admin, I need help with my order.",
  })
  @IsString()
  @IsNotEmpty()
  messageText: string;
}
