import { IsString, IsNotEmpty, IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export enum OrderStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  SHIPPED = "shipped",
  OUT_FOR_DELIVERED = "out_for_delivered",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: "New order status",
    enum: OrderStatus,
    example: OrderStatus.PROCESSING,
  })
  @IsEnum(OrderStatus)
  @IsNotEmpty()
  status: OrderStatus;
}
