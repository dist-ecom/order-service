import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order, OrderStatus, OrderItem, PaymentStatus } from './entities/order.entity';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { v4 as uuidv4 } from 'uuid';
import { ProductService } from './services/product.service';

@Injectable()
export class OrdersService {
  private orders: Order[] = [];

  constructor(private readonly productService: ProductService) {}

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

    const order: Order = {
      id: orderId,
      userId,
      items: orderItems,
      totalAmount,
      status: OrderStatus.PENDING,
      shippingAddress: createOrderDto.shippingAddress,
      paymentMethod: createOrderDto.paymentMethod,
      paymentStatus: PaymentStatus.PENDING,
      paymentIntentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.orders.push(order);
    return order;
  }

  async findAll(): Promise<Order[]> {
    return this.orders;
  }

  async findOne(id: string): Promise<Order> {
    const order = this.orders.find(order => order.id === id);
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  async findByUser(userId: string): Promise<Order[]> {
    return this.orders.filter(order => order.userId === userId);
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const order = await this.findOne(id);
    order.status = status;
    order.updatedAt = new Date();
    return order;
  }

  async updatePaymentStatus(id: string, updatePaymentStatusDto: UpdatePaymentStatusDto): Promise<Order> {
    const order = await this.findOne(id);
    
    // Update payment status
    order.paymentStatus = updatePaymentStatusDto.paymentStatus;
    
    // Update payment intent ID if provided
    if (updatePaymentStatusDto.paymentIntentId) {
      order.paymentIntentId = updatePaymentStatusDto.paymentIntentId;
    }
    
    // If payment is completed, update order status to processing
    if (updatePaymentStatusDto.paymentStatus === PaymentStatus.COMPLETED && 
        order.status === OrderStatus.PENDING) {
      order.status = OrderStatus.PROCESSING;
    }
    
    // If payment failed, update order status to cancelled
    if (updatePaymentStatusDto.paymentStatus === PaymentStatus.FAILED && 
        order.status === OrderStatus.PENDING) {
      order.status = OrderStatus.CANCELLED;
    }
    
    order.updatedAt = new Date();
    return order;
  }

  async cancel(id: string): Promise<Order> {
    const order = await this.findOne(id);
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be cancelled');
    }
    order.status = OrderStatus.CANCELLED;
    order.updatedAt = new Date();
    return order;
  }
} 