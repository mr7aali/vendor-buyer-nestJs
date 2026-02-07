import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsString, IsOptional } from "class-validator";
import { NotificationType } from "./create-notification.dto";

export enum BroadcastTarget {
  ALL = "all",
  BUYERS = "buyers",
  VENDORS = "vendors",
}

export class BroadcastNotificationDto {
  @ApiProperty({
    description:
      "Optional idempotency key to prevent duplicate broadcasts on retries",
    example: "e4f7b0aa-8a39-4a9b-9c4b-9f3c7f7a0f1e",
    required: false,
  })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @ApiProperty({
    description: "Target audience for the broadcast",
    enum: BroadcastTarget,
    example: BroadcastTarget.ALL,
  })
  @IsEnum(BroadcastTarget)
  @IsNotEmpty()
  target: BroadcastTarget;

  @ApiProperty({
    description: "Notification title",
    example: "Holiday Sale",
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: "Notification message",
    example: "Enjoy up to 40% off this weekend.",
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: "Notification type",
    enum: NotificationType,
    example: NotificationType.INFO,
    required: false,
  })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;
}
