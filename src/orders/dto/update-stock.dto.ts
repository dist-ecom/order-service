import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsInt } from 'class-validator';

export class UpdateStockDto {
  @ApiProperty({
    description: 'The amount to change the stock by (negative for decrease, positive for increase)',
    example: -10,
    type: 'integer',
  })
  @IsNumber()
  @IsInt()
  quantity: number;
} 