import { 
  IsArray, 
  IsNotEmpty, 
  IsNumber, 
  IsObject, 
  IsOptional, 
  IsString, 
  IsUUID, 
  Min, 
  ValidateNested 
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty({
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Smartphone X'
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Product description',
    example: 'Latest smartphone with amazing features'
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Unit price',
    example: 699.99
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'Quantity of the product',
    example: 2,
    minimum: 1
  })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({
    description: 'Product images',
    type: [String],
    required: false
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];
}

export class DraftOrderItemDto {
  @ApiProperty({ description: 'Product ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Quantity of the product', example: 2 })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;
}

export class CreateDraftOrderDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID('4')
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Shipping address',
    example: '123 Main St, Apt 4B, New York, NY 10001',
    required: false
  })
  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @ApiProperty({
    description: 'Total amount',
    example: 1399.98
  })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiProperty({
    description: 'Additional metadata',
    type: 'object',
    example: { source: 'web', giftWrapping: true },
    required: false
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Currency code', example: 'USD', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ 
    type: [DraftOrderItemDto],
    description: 'Order items'
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DraftOrderItemDto)
  @IsNotEmpty()
  items: DraftOrderItemDto[];
} 