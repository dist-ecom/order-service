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
      this.client.emit('order.created', order);
      this.logger.log(`Order created event published for order ${order.id}`);
    } catch (error) {
      this.logger.error('Failed to publish order created event', error);
    }
  }

  async publishOrderUpdated(order: any) {
    try {
      this.client.emit('order.updated', order);
      this.logger.log(`Order updated event published for order ${order.id}`);
    } catch (error) {
      this.logger.error('Failed to publish order updated event', error);
    }
  }

  async publishOrderCancelled(order: any) {
    try {
      this.client.emit('order.cancelled', order);
      this.logger.log(`Order cancelled event published for order ${order.id}`);
    } catch (error) {
      this.logger.error('Failed to publish order cancelled event', error);
    }
  }
} 