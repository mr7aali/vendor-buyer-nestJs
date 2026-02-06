import { IsOptional, IsUUID } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class CreateAdminChatThreadDto {
  @ApiPropertyOptional({
    description: "Buyer ID to start a chat with",
    format: "uuid",
  })
  @IsUUID()
  @IsOptional()
  buyerId?: string;

  @ApiPropertyOptional({
    description: "Vendor ID to start a chat with",
    format: "uuid",
  })
  @IsUUID()
  @IsOptional()
  vendorId?: string;
}
