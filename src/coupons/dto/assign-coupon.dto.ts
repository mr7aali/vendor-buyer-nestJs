import { IsUUID, IsNotEmpty } from 'class-validator';

export class AssignCouponDto {
  @IsUUID()
  @IsNotEmpty()
  buyerId: string;
}
