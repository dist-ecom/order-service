import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { RmqContext, Ctx, Payload, EventPattern } from '@nestjs/microservices';
import { OrdersService } from '../../orders/orders.service';
import { PaymentStatus } from '../../orders/entities/order.entity';

@Injectable()
export class PaymentsConsumer {
  private readonly logger = new Logger(PaymentsConsumer.name);

  constructor(
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService
  ) {}

  @EventPattern('payment.processed')
  async handlePaymentProcessed(
    @Payload() data: any,
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`Received payment.processed event with data: ${JSON.stringify(data)}`);
    
    try {
      const payment = data;
      
      if (!payment || !payment.orderId) {
        this.logger.error('Invalid payment data received');
        return;
      }
      
      this.logger.log(`Processing payment for order ${payment.orderId} with status ${payment.status}`);
      
      // Update the order with the payment information
      await this.ordersService.updatePaymentStatus(payment.orderId, {
        paymentStatus: payment.status === 'SUCCEEDED' ? PaymentStatus.COMPLETED : PaymentStatus.PENDING,
        paymentIntentId: payment.paymentIntentId,
      });
      
      // Acknowledge the message
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
      
      this.logger.log(`Payment processed event for order ${payment.orderId} handled successfully`);
    } catch (error) {
      this.logger.error(`Error processing payment.processed event: ${error.message}`, error.stack);
      
      // Acknowledge message even on error to prevent queue blocking
      // In production, you might want to use a dead-letter queue instead
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
    }
  }

  @EventPattern('payment.failed')
  async handlePaymentFailed(
    @Payload() data: any,
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`Received payment.failed event with data: ${JSON.stringify(data)}`);
    
    try {
      const payment = data;
      
      if (!payment || !payment.orderId) {
        this.logger.error('Invalid payment data received');
        return;
      }
      
      this.logger.log(`Processing failed payment for order ${payment.orderId}`);
      
      // Update the order with the failed payment status
      await this.ordersService.updatePaymentStatus(payment.orderId, {
        paymentStatus: PaymentStatus.FAILED,
        paymentIntentId: payment.paymentIntentId,
      });
      
      // Acknowledge the message
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
      
      this.logger.log(`Payment failed event for order ${payment.orderId} handled successfully`);
    } catch (error) {
      this.logger.error(`Error processing payment.failed event: ${error.message}`, error.stack);
      
      // Acknowledge message even on error
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
    }
  }
} 