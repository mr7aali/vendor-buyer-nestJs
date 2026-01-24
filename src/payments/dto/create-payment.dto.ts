import { IsUUID, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreatePaymentDto {
  @ApiProperty({
    description: "Order ID (UUID) to create payment for",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  @IsUUID()
  @IsNotEmpty()
  orderId: string;
}

// dto/payment-response.dto.ts
export class PaymentResponseDto {
  success: boolean;
  paymentId: string;
  sessionId: string;
  paymentLink: string;
  expiresAt: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  message?: string;
}
