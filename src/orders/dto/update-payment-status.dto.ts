import { IsEnum, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus } from '../entities/order.entity';

export class UpdatePaymentStatusDto {
  @ApiProperty({
    description: 'The new payment status',
    enum: PaymentStatus,
    example: PaymentStatus.COMPLETED,
  })
  @IsEnum(PaymentStatus)
  @IsNotEmpty()
  paymentStatus: PaymentStatus;

  @ApiProperty({
    description: 'The Stripe payment intent ID',
    example: 'pi_3NkXYZABCDEFGHIJKLMNOPQR',
    required: false,
  })
  @IsString()
  @IsOptional()
  paymentIntentId?: string;
} 