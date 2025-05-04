import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class RabbitmqService {
  private readonly logger = new Logger(RabbitmqService.name);

  constructor(
    @Inject('RABBITMQ_CLIENT') private readonly client: ClientProxy,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.client.connect();
      this.logger.log('Connected to RabbitMQ');
    } catch (err) {
      this.logger.error('Failed to connect to RabbitMQ', err);
    }
  }

  async publishOrderCreated(order: any) {
    try {
      this.logger.log(`Publishing order.created event: ${JSON.stringify(order)}`);
      await this.client.emit('order.created', order).toPromise();
      this.logger.log(`Order created event published for order ${order.id}`);
    } catch (error) {
      this.logger.error(`Failed to publish order created event: ${error.message}`, error.stack);
    }
  }

  async publishOrderUpdated(order: any) {
    try {
      this.logger.log(`Publishing order.updated event: ${JSON.stringify(order)}`);
      await this.client.emit('order.updated', order).toPromise();
      this.logger.log(`Order updated event published for order ${order.id}`);
    } catch (error) {
      this.logger.error(`Failed to publish order updated event: ${error.message}`, error.stack);
    }
  }

  async publishOrderCancelled(order: any) {
    try {
      this.logger.log(`Publishing order.cancelled event: ${JSON.stringify(order)}`);
      await this.client.emit('order.cancelled', order).toPromise();
      this.logger.log(`Order cancelled event published for order ${order.id}`);
    } catch (error) {
      this.logger.error(`Failed to publish order cancelled event: ${error.message}`, error.stack);
    }
  }
} 