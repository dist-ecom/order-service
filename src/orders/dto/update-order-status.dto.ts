import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: 'The new status of the order',
    enum: OrderStatus,
    example: OrderStatus.SHIPPED,
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;
} 