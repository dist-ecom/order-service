import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RmqRecordBuilder } from '@nestjs/microservices';

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
      this.logger.log(`Preparing to publish order.created event for order ${order.id}`);

      // Convert any BigInt to string to ensure proper JSON serialization
      const orderData = JSON.parse(JSON.stringify(order, (_, value) => 
        typeof value === 'bigint' ? value.toString() : value
      ));

      // Use emit() for one-way event notifications instead of send()
      this.logger.log(`Publishing order.created event for order ${order.id}`);
      await this.client.emit('order.created', orderData).toPromise();
      this.logger.log(`Order created event published for order ${order.id}`);
    } catch (error) {
      this.logger.error(`Failed to publish order created event: ${error.message}`, error.stack);
      throw error; // Re-throw to allow the caller to handle this error
    }
  }

  async publishOrderUpdated(order: any) {
    try {
      // Convert any BigInt to string to ensure proper JSON serialization
      const orderData = JSON.parse(JSON.stringify(order, (_, value) => 
        typeof value === 'bigint' ? value.toString() : value
      ));

      // Use emit() for one-way event notifications instead of send()
      this.logger.log(`Publishing order.updated event for order ${order.id}`);
      await this.client.emit('order.updated', orderData).toPromise();
      this.logger.log(`Order updated event published for order ${order.id}`);
    } catch (error) {
      this.logger.error(`Failed to publish order updated event: ${error.message}`, error.stack);
      throw error;
    }
  }

  async publishOrderCancelled(order: any) {
    try {
      // Convert any BigInt to string to ensure proper JSON serialization
      const orderData = JSON.parse(JSON.stringify(order, (_, value) => 
        typeof value === 'bigint' ? value.toString() : value
      ));

      // Use emit() for one-way event notifications instead of send()
      this.logger.log(`Publishing order.cancelled event for order ${order.id}`);
      await this.client.emit('order.cancelled', orderData).toPromise();
      this.logger.log(`Order cancelled event published for order ${order.id}`);
    } catch (error) {
      this.logger.error(`Failed to publish order cancelled event: ${error.message}`, error.stack);
      throw error;
    }
  }
} 