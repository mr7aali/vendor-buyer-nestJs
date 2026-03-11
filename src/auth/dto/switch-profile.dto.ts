import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { UserType } from "./register.dto";

export enum SwitchProfileRole {
  BUYER = UserType.BUYER,
  VENDOR = UserType.VENDOR,
}

export class SwitchProfileDto {
  @ApiProperty({
    description: "Target profile role to switch into",
    enum: SwitchProfileRole,
    example: SwitchProfileRole.VENDOR,
  })
  @IsEnum(SwitchProfileRole)
  targetRole: SwitchProfileRole;
}
