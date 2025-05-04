import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef, ForbiddenException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order, OrderStatus, OrderItem, PaymentStatus } from './entities/order.entity';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { v4 as uuidv4 } from 'uuid';
import { ProductService } from './services/product.service';
import { PrismaService } from '../prisma/prisma.service';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';

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
    // Get product IDs from order items
    const productIds = createOrderDto.items.map(item => item.productId);
    
    // Validate products and get their details
    const productMap = await this.productService.validateProducts(productIds);

    // Calculate total amount and prepare order items
    let totalAmount = 0;
    const orderItems: OrderItem[] = createOrderDto.items.map(item => {
      const product = productMap.get(item.productId);
      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      return {
        id: uuidv4(),
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
        name: product.name,
        orderId: '', // Will be set after order creation
      };
    });

    const orderId = uuidv4();
    
    // Set the orderId for each item
    orderItems.forEach(item => {
      item.orderId = orderId;
    });

    const order = await this.prisma.order.create({
      data: {
        id: orderId,
        userId,
        items: orderItems as any, // Store as JSON
        totalAmount,
        status: OrderStatus.PENDING,
        shippingAddress: createOrderDto.shippingAddress,
        paymentMethod: createOrderDto.paymentMethod,
        paymentStatus: PaymentStatus.PENDING,
      },
    });

    // Publish order created event
    await this.rabbitmqService.publishOrderCreated(order);

    return order as unknown as Order;
  }

  async findAll(): Promise<Order[]> {
    const orders = await this.prisma.order.findMany();
    return orders as unknown as Order[];
  }

  async findByUser(userId: string): Promise<Order[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId },
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
    const order = await this.findOne(id);
    
    // If the order is being shipped, decrease the stock for each product
    if (status === OrderStatus.SHIPPED && order.status !== OrderStatus.SHIPPED) {
      try {
        await Promise.all(
          (order.items as unknown as OrderItem[]).map(item => 
            this.productService.decreaseStock(item.productId, item.quantity)
          )
        );
      } catch (error) {
        this.logger.error(`Failed to update stock: ${error.message}`);
        // For now, we'll continue with the status update even if stock update fails
        // This is a temporary workaround until the product service is fully implemented
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
    
    return updatedOrder as unknown as Order;
  }

  async updatePaymentStatus(id: string, updatePaymentStatusDto: UpdatePaymentStatusDto): Promise<Order> {
    const order = await this.findOne(id);
    
    // Determine if order status should be updated based on payment status
    let orderStatus = undefined;
    
    // If payment is completed, update order status to processing
    if (updatePaymentStatusDto.paymentStatus === PaymentStatus.COMPLETED && 
        order.status === OrderStatus.PENDING) {
      orderStatus = OrderStatus.PROCESSING;
    }
    
    // If payment failed, update order status to cancelled
    if (updatePaymentStatusDto.paymentStatus === PaymentStatus.FAILED && 
        order.status === OrderStatus.PENDING) {
      orderStatus = OrderStatus.CANCELLED;
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
    
    return updatedOrder as unknown as Order;
  }

  async cancel(id: string): Promise<Order> {
    const order = await this.findOne(id);
    
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be cancelled');
    }
    
    const cancelledOrder = await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
        updatedAt: new Date(),
      },
    });
    
    // Publish order cancelled event
    await this.rabbitmqService.publishOrderCancelled(cancelledOrder);
    
    return cancelledOrder as unknown as Order;
  }
} 