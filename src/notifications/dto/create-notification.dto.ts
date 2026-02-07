import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsUUID,
  IsOptional,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export enum NotificationType {
  INFO = "info",
  SUCCESS = "success",
  WARNING = "warning",
  ERROR = "error",
}

export enum NotificationCategory {
  SYSTEM = "system",
  BUYER = "buyer",
  VENDOR = "vendor",
  BROADCAST = "broadcast",
}

export class CreateNotificationDto {
  @ApiProperty({
    description: "User ID (UUID) to send notification to",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: "Notification title",
    example: "Order Confirmed",
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: "Notification message",
    example: "Your order #12345 has been confirmed.",
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: "Notification type",
    enum: NotificationType,
    example: NotificationType.SUCCESS,
  })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @ApiProperty({
    description: "Notification category",
    enum: NotificationCategory,
    example: NotificationCategory.SYSTEM,
    required: false,
  })
  @IsEnum(NotificationCategory)
  @IsOptional()
  category?: NotificationCategory;
}
