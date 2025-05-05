import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum OrderStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export class OrderItem {
  @ApiProperty({
    description: 'The unique identifier of the order item',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

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

  @ApiProperty({
    description: 'The name of the product at the time of order',
    example: 'Premium Wireless Headphones',
  })
  name: string;

  @ApiProperty({
    description: 'The ID of the order this item belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  orderId: string;
}

@Entity('orders')
export class Order {
  @ApiProperty({
    description: 'The unique identifier of the order',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'The ID of the user who placed the order',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column()
  userId: string;

  @ApiProperty({
    description: 'The items in the order',
    type: [OrderItem],
    example: [{
      id: '123e4567-e89b-12d3-a456-426614174000',
      productId: '123e4567-e89b-12d3-a456-426614174000',
      quantity: 2,
      price: 29.99,
      name: 'Premium Wireless Headphones',
      orderId: '123e4567-e89b-12d3-a456-426614174000',
    }],
  })
  @Column('jsonb')
  items: OrderItem[];

  @ApiProperty({
    description: 'The total amount of the order',
    example: 59.98,
    minimum: 0,
  })
  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  @ApiProperty({
    description: 'The current status of the order',
    enum: OrderStatus,
    example: OrderStatus.PENDING,
  })
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @ApiProperty({
    description: 'The shipping address for the order',
    example: '123 Main St, Apt 4B, New York, NY 10001',
  })
  @Column({ nullable: true })
  shippingAddress: string;

  @ApiProperty({
    description: 'The tracking number for the order',
    example: '1Z999AA10123456784',
    required: false,
  })
  @Column({ nullable: true })
  trackingNumber: string;

  @ApiProperty({
    description: 'The payment method for the order',
    example: 'credit_card',
    enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer'],
  })
  @Column()
  paymentMethod: string;

  @ApiProperty({
    description: 'The status of the payment',
    enum: PaymentStatus,
    example: PaymentStatus.PENDING,
  })
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @ApiProperty({
    description: 'The Stripe payment intent ID',
    example: 'pi_3NkXYZABCDEFGHIJKLMNOPQR',
    required: false,
  })
  @Column({ nullable: true })
  paymentIntentId: string;

  @ApiProperty({
    description: 'The currency used for the order',
    example: 'USD',
    default: 'USD',
  })
  @Column({ default: 'USD' })
  currency: string;

  @ApiProperty({
    description: 'Additional metadata for the order',
    type: 'object',
    example: { source: 'web', giftWrapping: true },
  })
  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @ApiProperty({
    description: 'The date and time when the draft order expires',
    example: '2024-03-15T11:00:00Z',
    required: false,
  })
  @Column({ nullable: true })
  expiresAt: Date;

  @ApiProperty({
    description: 'The date and time when the order was created',
    example: '2024-03-15T10:30:00Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'The date and time when the order was last updated',
    example: '2024-03-15T10:30:00Z',
  })
  @UpdateDateColumn()
  updatedAt: Date;
} 