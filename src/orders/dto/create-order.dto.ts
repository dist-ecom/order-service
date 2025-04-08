import { IsArray, IsNotEmpty, IsString, IsNumber, Min, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  PAYPAL = 'paypal',
  BANK_TRANSFER = 'bank_transfer',
}

export class OrderItemDto {
  @ApiProperty({
    description: 'The ID of the product to order',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    description: 'The quantity of the product to order',
    example: 2,
    minimum: 1,
    type: 'integer',
  })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({
    description: 'The items to be ordered',
    type: [OrderItemDto],
    example: [
      {
        productId: '123e4567-e89b-12d3-a456-426614174000',
        quantity: 2,
      },
      {
        productId: '987fcdeb-a987-54d3-b321-987654321000',
        quantity: 1,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({
    description: 'The shipping address for the order',
    example: '123 Main St, Apt 4B, New York, NY 10001',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  shippingAddress: string;

  @ApiProperty({
    description: 'The payment method for the order',
    enum: PaymentMethod,
    example: PaymentMethod.CREDIT_CARD,
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
} 