import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '../entities/order.entity';

class UpdateOrderItemDto {
  @ApiProperty({ description: 'Product ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiProperty({ description: 'Quantity of the product', example: 2 })
  @IsOptional()
  quantity?: number;
}

export class UpdateOrderDto {
  @ApiProperty({ 
    description: 'Order status', 
    example: 'PENDING',
    enum: OrderStatus
  })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @ApiProperty({ 
    description: 'Shipping address', 
    example: '123 Main St, City, Country' 
  })
  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @ApiProperty({ 
    type: [UpdateOrderItemDto],
    description: 'Order items'
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateOrderItemDto)
  @IsOptional()
  items?: UpdateOrderItemDto[];
} 