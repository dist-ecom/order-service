import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus } from '../entities/order.entity';

export class OrderItemResponseDto {
  @ApiProperty({
    description: 'The ID of the product',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  productId: string;

  @ApiProperty({
    description: 'The quantity of the product',
    example: 2,
  })
  quantity: number;

  @ApiProperty({
    description: 'The price of the product at the time of order',
    example: 29.99,
  })
  price: number;
}

export class OrderResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the order',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'The ID of the user who placed the order',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'The items in the order',
    type: [OrderItemResponseDto],
  })
  items: OrderItemResponseDto[];

  @ApiProperty({
    description: 'The total amount of the order',
    example: 59.98,
  })
  totalAmount: number;

  @ApiProperty({
    description: 'The current status of the order',
    enum: OrderStatus,
    example: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @ApiProperty({
    description: 'The payment status of the order',
    enum: PaymentStatus,
    example: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @ApiProperty({
    description: 'The shipping address for the order',
    example: '123 Main St, Apt 4B, New York, NY 10001',
  })
  shippingAddress: string;

  @ApiProperty({
    description: 'The tracking number for the order',
    example: 'TRACK123456789',
    nullable: true,
  })
  trackingNumber: string | null;

  @ApiProperty({
    description: 'The date when the order was created',
    example: '2024-03-20T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The date when the order was last updated',
    example: '2024-03-20T10:00:00Z',
  })
  updatedAt: Date;
} 