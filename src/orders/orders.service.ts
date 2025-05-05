import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItem } from './entities/order.entity';
import { Order, OrderStatus, PaymentStatus } from '@prisma/client';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { v4 as uuidv4 } from 'uuid';
import { ProductService } from './services/product.service';
import { PrismaService } from '../prisma/prisma.service';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';

// Add type conversion helper
import * as EntityTypes from './entities/order.entity';

// Use this function to convert between entity and Prisma payment status when necessary
function convertPaymentStatus(status: string): PaymentStatus {
  return status as PaymentStatus;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly productService: ProductService,
    @Inject(forwardRef(() => RabbitmqService))
    private readonly rabbitmqService: RabbitmqService,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId: string): Promise<Order> {
    this.logger.log(`Creating order for user ${userId} with ${createOrderDto.items.length} items`);
    
    try {
      // Validate order items - ensure we have at least one item
      if (!createOrderDto.items.length) {
        throw new BadRequestException('Order must contain at least one item');
      }
      
      // Get product IDs from order items
      const productIds = createOrderDto.items.map(item => item.productId);
      
      // Validate products and get their details
      const productMap = await this.productService.validateProducts(productIds);
      
      // Validate product availability and calculate total amount
      let totalAmount = 0;
      const orderItems: OrderItem[] = [];
      
      for (const item of createOrderDto.items) {
        const product = productMap.get(item.productId);
        
        if (!product) {
          throw new BadRequestException(`Product ${item.productId} not found or unavailable`);
        }
        
        // Check if quantity is valid
        if (item.quantity <= 0) {
          throw new BadRequestException(`Invalid quantity (${item.quantity}) for product ${item.productId}`);
        }
        
        // Check if product has sufficient stock
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product ${product.name}. Requested: ${item.quantity}, Available: ${product.stock}`
          );
        }
        
        const itemTotal = product.price * item.quantity;
        totalAmount += itemTotal;
        
        orderItems.push({
          id: uuidv4(),
          productId: item.productId,
          quantity: item.quantity,
          price: product.price,
          name: product.name,
          orderId: '', // Will be set after order creation
        });
      }

      const orderId = uuidv4();
      
      // Set the orderId for each item
      orderItems.forEach(item => {
        item.orderId = orderId;
      });

      // Validate shipping address
      if (!createOrderDto.shippingAddress || createOrderDto.shippingAddress.trim() === '') {
        throw new BadRequestException('Shipping address is required');
      }

      // Validate payment method
      const validPaymentMethods = ['credit_card', 'debit_card', 'paypal', 'bank_transfer'];
      if (!validPaymentMethods.includes(createOrderDto.paymentMethod)) {
        throw new BadRequestException(
          `Invalid payment method. Supported methods: ${validPaymentMethods.join(', ')}`
        );
      }

      // Create order in database
      const order = await this.prisma.order.create({
        data: {
          id: orderId,
          userId,
          items: orderItems as any, // Store as JSON
          totalAmount,
          status: OrderStatus.pending,
          shippingAddress: createOrderDto.shippingAddress,
          paymentMethod: createOrderDto.paymentMethod,
          paymentStatus: PaymentStatus.pending,
        },
      });

      // Reserve products temporarily
      try {
        await Promise.all(
          orderItems.map(item =>
            this.productService.reserveStock(item.productId, item.quantity)
          )
        );
      } catch (error) {
        this.logger.error(`Failed to reserve stock: ${error.message}`, error.stack);
        // Continue but log the error - we'll consider this non-critical
      }

      // Publish order created event
      await this.rabbitmqService.publishOrderCreated(order);
      
      this.logger.log(`Created order ${orderId} with total amount ${totalAmount}`);

      return order as unknown as Order;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to create order: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to create order: ${error.message}`);
    }
  }

  async findAll(userId?: string, status?: string): Promise<Order[]> {
    const where: any = {};
    
    if (userId) {
      where.userId = userId;
    }
    
    if (status) {
      where.status = status;
    }
    
    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return orders as unknown as Order[];
  }

  async findByUser(userId: string): Promise<Order[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return orders as unknown as Order[];
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });
    
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    
    return order as unknown as Order;
  }

  async findOneForUser(id: string, userId: string, isAdmin: boolean): Promise<Order> {
    const order = await this.findOne(id);
    
    // If user is not admin and the order doesn't belong to them, deny access
    if (!isAdmin && order.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this order');
    }
    
    return order;
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    this.logger.log(`Updating order ${id} status to ${status}`);
    
    try {
      const order = await this.findOne(id);
      
      // Validate status transition
      this.validateStatusTransition(order.status, status);
      
      // Specific logic for different status changes
      if (status === OrderStatus.shipped && order.status !== OrderStatus.shipped) {
        // Verify payment completed before shipping
        if (order.paymentStatus !== PaymentStatus.completed && 
            order.paymentStatus !== PaymentStatus.paid) {
          throw new BadRequestException(
            'Cannot ship an order that has not been paid for. Current payment status: ' + order.paymentStatus
          );
        }
        
        // Decrease stock permanently for shipped orders
        try {
          await Promise.all(
            (order.items as unknown as OrderItem[]).map(item => 
              this.productService.decreaseStock(item.productId, item.quantity)
            )
          );
        } catch (error) {
          this.logger.error(`Failed to update stock: ${error.message}`, error.stack);
          throw new InternalServerErrorException('Failed to update product inventory: ' + error.message);
        }
      }
      
      // If order is being cancelled, release any reserved stock
      if (status === OrderStatus.cancelled && 
          (order.status === OrderStatus.pending || order.status === OrderStatus.processing)) {
        try {
          await Promise.all(
            (order.items as unknown as OrderItem[]).map(item => 
              this.productService.releaseStock(item.productId, item.quantity)
            )
          );
        } catch (error) {
          this.logger.error(`Failed to release stock: ${error.message}`, error.stack);
          // Continue with cancellation even if stock release fails
        }
      }
      
      const updatedOrder = await this.prisma.order.update({
        where: { id },
        data: {
          status,
          updatedAt: new Date(),
        },
      });
      
      // Publish order updated event
      await this.rabbitmqService.publishOrderUpdated(updatedOrder);
      
      this.logger.log(`Updated order ${id} status from ${order.status} to ${status}`);
      
      return updatedOrder as unknown as Order;
    } catch (error) {
      if (error instanceof NotFoundException || 
          error instanceof BadRequestException || 
          error instanceof InternalServerErrorException) {
        throw error;
      }
      this.logger.error(`Failed to update order status: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to update order status: ' + error.message);
    }
  }

  // Helper method to validate status transitions
  private validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    // Define valid transitions
    const validTransitions = {
      [OrderStatus.pending]: [OrderStatus.processing, OrderStatus.cancelled],
      [OrderStatus.processing]: [OrderStatus.shipped, OrderStatus.cancelled],
      [OrderStatus.shipped]: [OrderStatus.delivered],
      [OrderStatus.delivered]: [], // Terminal state
      [OrderStatus.cancelled]: [], // Terminal state
      [OrderStatus.draft]: [OrderStatus.pending, OrderStatus.expired, OrderStatus.cancelled],
      [OrderStatus.expired]: [], // Terminal state
    };

    if (!validTransitions[currentStatus].includes(newStatus) && currentStatus !== newStatus) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}. Valid transitions: ${validTransitions[currentStatus].join(', ')}`
      );
    }
  }

  async updatePaymentStatus(id: string, updatePaymentStatusDto: UpdatePaymentStatusDto): Promise<Order> {
    this.logger.log(`Updating order ${id} payment status to ${updatePaymentStatusDto.paymentStatus}`);
    
    try {
      const order = await this.findOne(id);
      
      // Validate payment status transition
      this.validatePaymentStatusTransition(order.paymentStatus, updatePaymentStatusDto.paymentStatus);
      
      // Determine if order status should be updated based on payment status
      let orderStatus = undefined;
      
      // If payment is completed, update order status to processing
      if (updatePaymentStatusDto.paymentStatus === PaymentStatus.completed && 
          order.status === OrderStatus.pending) {
        orderStatus = OrderStatus.processing;
      }
      
      // If payment failed, update order status to cancelled and release stock
      if (updatePaymentStatusDto.paymentStatus === PaymentStatus.failed && 
          order.status === OrderStatus.pending) {
        orderStatus = OrderStatus.cancelled;
        
        // Release reserved stock
        try {
          await Promise.all(
            (order.items as unknown as OrderItem[]).map(item => 
              this.productService.releaseStock(item.productId, item.quantity)
            )
          );
        } catch (error) {
          this.logger.error(`Failed to release stock: ${error.message}`, error.stack);
          // Continue with updating payment status even if stock release fails
        }
      }

      const updatedOrder = await this.prisma.order.update({
        where: { id },
        data: {
          paymentStatus: updatePaymentStatusDto.paymentStatus,
          paymentIntentId: updatePaymentStatusDto.paymentIntentId || undefined,
          status: orderStatus,
          updatedAt: new Date(),
        },
      });
      
      // Publish order updated event
      await this.rabbitmqService.publishOrderUpdated(updatedOrder);
      
      this.logger.log(`Updated order ${id} payment status to ${updatePaymentStatusDto.paymentStatus}`);
      
      return updatedOrder as unknown as Order;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to update payment status: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to update payment status: ' + error.message);
    }
  }

  // Helper method to validate payment status transitions
  private validatePaymentStatusTransition(currentStatus: PaymentStatus, newStatus: PaymentStatus): void {
    // Define valid transitions
    const validTransitions = {
      [PaymentStatus.pending]: [PaymentStatus.paid, PaymentStatus.completed, PaymentStatus.failed],
      [PaymentStatus.paid]: [PaymentStatus.completed, PaymentStatus.refunded],
      [PaymentStatus.completed]: [PaymentStatus.refunded],
      [PaymentStatus.failed]: [PaymentStatus.pending], // Allow retrying failed payments
      [PaymentStatus.refunded]: [], // Terminal state
    };

    if (!validTransitions[currentStatus].includes(newStatus) && currentStatus !== newStatus) {
      throw new BadRequestException(
        `Invalid payment status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  async cancel(id: string): Promise<Order> {
    this.logger.log(`Cancelling order ${id}`);
    
    try {
      const order = await this.findOne(id);
      
      if (order.status !== OrderStatus.pending && order.status !== OrderStatus.processing) {
        throw new BadRequestException('Only pending or processing orders can be cancelled');
      }
      
      // Release reserved stock
      try {
        await Promise.all(
          (order.items as unknown as OrderItem[]).map(item => 
            this.productService.releaseStock(item.productId, item.quantity)
          )
        );
      } catch (error) {
        this.logger.error(`Failed to release stock: ${error.message}`, error.stack);
        // Continue with cancellation even if stock release fails
      }
      
      const cancelledOrder = await this.prisma.order.update({
        where: { id },
        data: {
          status: OrderStatus.cancelled,
          updatedAt: new Date(),
        },
      });
      
      // Publish order cancelled event
      await this.rabbitmqService.publishOrderCancelled(cancelledOrder);
      
      this.logger.log(`Cancelled order ${id}`);
      
      return cancelledOrder as unknown as Order;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to cancel order: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to cancel order: ' + error.message);
    }
  }

  async createDraft(createDraftOrderDto: any): Promise<any> {
    this.logger.log(`Creating draft order for user ${createDraftOrderDto.userId}`);
    
    try {
      // Generate order ID
      const orderId = uuidv4();
      
      // Convert draft items to order items
      const orderItems = createDraftOrderDto.items.map(item => ({
        id: uuidv4(),
        productId: item.productId,
        quantity: item.quantity,
        price: 0, // Will be filled with actual price when product details are fetched
        name: '', // Will be filled with actual name when product details are fetched
        orderId,
      }));
      
      // Create draft order in database
      const order = await this.prisma.order.create({
        data: {
          id: orderId,
          userId: createDraftOrderDto.userId,
          items: orderItems as any,
          totalAmount: createDraftOrderDto.totalAmount || 0,
          status: OrderStatus.draft,
          shippingAddress: createDraftOrderDto.shippingAddress || '',
          paymentMethod: 'pending',
          paymentStatus: PaymentStatus.pending,
          currency: createDraftOrderDto.currency || 'USD',
          metadata: createDraftOrderDto.metadata || {},
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // Expires in 30 minutes
        },
      });
      
      this.logger.log(`Created draft order ${orderId}`);
      
      return order;
    } catch (error) {
      this.logger.error(`Failed to create draft order: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to create draft order: ${error.message}`);
    }
  }

  async confirmOrder(id: string, confirmData: any): Promise<any> {
    this.logger.log(`Confirming order ${id} with payment intent ${confirmData.paymentIntentId}`);
    
    try {
      const order = await this.prisma.order.findUnique({
        where: { id },
      });
      
      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }
      
      if (order.status !== OrderStatus.draft) {
        throw new BadRequestException(`Order ${id} is not in DRAFT status and cannot be confirmed`);
      }
      
      // Update order with payment info and change status to PENDING
      const updatedOrder = await this.prisma.order.update({
        where: { id },
        data: {
          status: OrderStatus.pending,
          paymentStatus: PaymentStatus.paid,
          paymentIntentId: confirmData.paymentIntentId,
          paymentMethod: confirmData.paymentMethodId || 'card',
          updatedAt: new Date(),
        },
      });
      
      // Publish order confirmed event
      await this.rabbitmqService.publishOrderCreated(updatedOrder);
      
      this.logger.log(`Order ${id} confirmed successfully`);
      
      return updatedOrder;
    } catch (error) {
      this.logger.error(`Failed to confirm order: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to confirm order: ${error.message}`);
    }
  }

  async expireOrder(id: string): Promise<any> {
    this.logger.log(`Marking order ${id} as expired`);
    
    try {
      const order = await this.prisma.order.findUnique({
        where: { id },
      });
      
      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }
      
      if (order.status !== OrderStatus.draft) {
        throw new BadRequestException(`Order ${id} is not in DRAFT status and cannot be expired`);
      }
      
      // Update order status to EXPIRED
      const updatedOrder = await this.prisma.order.update({
        where: { id },
        data: {
          status: OrderStatus.expired,
          updatedAt: new Date(),
        },
      });
      
      this.logger.log(`Order ${id} marked as expired`);
      
      return updatedOrder;
    } catch (error) {
      this.logger.error(`Failed to expire order: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to expire order: ${error.message}`);
    }
  }

  async update(id: string, updateOrderDto: any, userId: string): Promise<any> {
    this.logger.log(`Updating order ${id} for user ${userId}`);
    
    try {
      // Get the order and verify ownership
      const order = await this.findOneForUser(id, userId, false);
      
      // Only allow updates for orders in PENDING status
      if (order.status !== OrderStatus.pending) {
        throw new BadRequestException(`Cannot update order in ${order.status} status`);
      }
      
      // Prepare update data
      const updateData: any = {};
      
      if (updateOrderDto.shippingAddress) {
        updateData.shippingAddress = updateOrderDto.shippingAddress;
      }
      
      // Don't allow changing items after order creation
      if (updateOrderDto.items) {
        throw new BadRequestException('Cannot modify order items after creation');
      }
      
      // Update the order
      const updatedOrder = await this.prisma.order.update({
        where: { id },
        data: updateData,
      });
      
      this.logger.log(`Order ${id} updated successfully`);
      
      return updatedOrder;
    } catch (error) {
      this.logger.error(`Failed to update order: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || 
          error instanceof BadRequestException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to update order: ${error.message}`);
    }
  }

  async getOrderDetails(id: string): Promise<any> {
    this.logger.log(`Getting order details for ${id}`);
    
    try {
      const order = await this.prisma.order.findUnique({
        where: { id },
      });
      
      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }
      
      // Return order with formatted items
      return {
        id: order.id,
        userId: order.userId,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        currency: order.currency || 'USD',
        items: order.items,
        shippingAddress: order.shippingAddress,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to get order details: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to get order details: ${error.message}`);
    }
  }
} 