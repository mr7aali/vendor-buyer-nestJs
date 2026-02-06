import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class ChangeAdminPasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: "New password (min 6 chars)" })
  @IsString()
  @MinLength(6)
  newPassword: string;

  @ApiProperty()
  @IsString()
  confirmPassword: string;
}
