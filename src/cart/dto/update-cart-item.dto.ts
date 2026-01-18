import { IsNumber, Min, IsNotEmpty } from 'class-validator';

export class UpdateCartItemDto {
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  quantity: number;
}
