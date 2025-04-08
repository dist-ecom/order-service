import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { ProductService } from './services/product.service';
import { Order, OrderStatus, PaymentStatus } from './entities/order.entity';
import { CreateOrderDto, PaymentMethod } from './dto/create-order.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('OrdersService', () => {
  let service: OrdersService;
  let productService: ProductService;

  const mockProductService = {
    validateProducts: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: ProductService,
          useValue: mockProductService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    productService = module.get<ProductService>(ProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const mockUserId = 'user-123';
    const mockCreateOrderDto: CreateOrderDto = {
      items: [
        { productId: 'product-1', quantity: 2 },
        { productId: 'product-2', quantity: 1 },
      ],
      shippingAddress: '123 Main St, New York, NY 10001',
      paymentMethod: PaymentMethod.CREDIT_CARD,
    };

    const mockProductMap = new Map([
      ['product-1', { id: 'product-1', name: 'Product 1', price: 10.99 }],
      ['product-2', { id: 'product-2', name: 'Product 2', price: 24.99 }],
    ]);

    it('should create a new order', async () => {
      mockProductService.validateProducts.mockResolvedValue(mockProductMap);

      const result = await service.create(mockCreateOrderDto, mockUserId);

      expect(result).toBeDefined();
      expect(result.userId).toBe(mockUserId);
      expect(result.items).toHaveLength(2);
      expect(result.totalAmount).toBe(46.97); // (10.99 * 2) + 24.99
      expect(result.status).toBe(OrderStatus.PENDING);
      expect(result.paymentStatus).toBe(PaymentStatus.PENDING);
      expect(result.paymentIntentId).toBeNull();
      expect(mockProductService.validateProducts).toHaveBeenCalledWith(['product-1', 'product-2']);
    });

    it('should throw an error if product validation fails', async () => {
      mockProductService.validateProducts.mockRejectedValue(new Error('Product not found'));

      await expect(service.create(mockCreateOrderDto, mockUserId)).rejects.toThrow();
    });
  });

  describe('findAll', () => {
    it('should return an array of orders', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          userId: 'user-1',
          items: [],
          totalAmount: 100,
          status: OrderStatus.PENDING,
          shippingAddress: 'Address 1',
          paymentMethod: PaymentMethod.CREDIT_CARD,
          paymentStatus: PaymentStatus.PENDING,
          paymentIntentId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'order-2',
          userId: 'user-2',
          items: [],
          totalAmount: 200,
          status: OrderStatus.DELIVERED,
          shippingAddress: 'Address 2',
          paymentMethod: PaymentMethod.PAYPAL,
          paymentStatus: PaymentStatus.COMPLETED,
          paymentIntentId: 'pi_123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Add orders to the service's private array
      (service as any).orders = mockOrders;

      const result = await service.findAll();

      expect(result).toEqual(mockOrders);
    });
  });

  describe('findOne', () => {
    it('should return an order by id', async () => {
      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        items: [],
        totalAmount: 100,
        status: OrderStatus.PENDING,
        shippingAddress: 'Address 1',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        paymentStatus: PaymentStatus.PENDING,
        paymentIntentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add order to the service's private array
      (service as any).orders = [mockOrder];

      const result = await service.findOne('order-1');

      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException if order not found', async () => {
      // Empty orders array
      (service as any).orders = [];

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUser', () => {
    it('should return orders for a specific user', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          userId: 'user-1',
          items: [],
          totalAmount: 100,
          status: OrderStatus.PENDING,
          shippingAddress: 'Address 1',
          paymentMethod: PaymentMethod.CREDIT_CARD,
          paymentStatus: PaymentStatus.PENDING,
          paymentIntentId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'order-2',
          userId: 'user-1',
          items: [],
          totalAmount: 200,
          status: OrderStatus.DELIVERED,
          shippingAddress: 'Address 2',
          paymentMethod: PaymentMethod.PAYPAL,
          paymentStatus: PaymentStatus.COMPLETED,
          paymentIntentId: 'pi_123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'order-3',
          userId: 'user-2',
          items: [],
          totalAmount: 300,
          status: OrderStatus.PROCESSING,
          shippingAddress: 'Address 3',
          paymentMethod: PaymentMethod.CREDIT_CARD,
          paymentStatus: PaymentStatus.PROCESSING,
          paymentIntentId: 'pi_456',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Add orders to the service's private array
      (service as any).orders = mockOrders;

      const result = await service.findByUser('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('order-1');
      expect(result[1].id).toBe('order-2');
    });
  });

  describe('updateStatus', () => {
    it('should update the status of an order', async () => {
      const originalDate = new Date('2024-01-01T00:00:00.000Z');
      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        items: [],
        totalAmount: 100,
        status: OrderStatus.PENDING,
        shippingAddress: 'Address 1',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        paymentStatus: PaymentStatus.PENDING,
        paymentIntentId: null,
        createdAt: originalDate,
        updatedAt: originalDate,
      };

      // Add order to the service's private array
      (service as any).orders = [mockOrder];

      const result = await service.updateStatus('order-1', OrderStatus.PROCESSING);

      expect(result.status).toBe(OrderStatus.PROCESSING);
      expect(result.updatedAt.getTime()).toBeGreaterThan(originalDate.getTime());
    });

    it('should throw NotFoundException if order not found', async () => {
      // Empty orders array
      (service as any).orders = [];

      await expect(service.updateStatus('non-existent', OrderStatus.PROCESSING)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updatePaymentStatus', () => {
    it('should update the payment status of an order', async () => {
      const originalDate = new Date('2024-01-01T00:00:00.000Z');
      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        items: [],
        totalAmount: 100,
        status: OrderStatus.PENDING,
        shippingAddress: 'Address 1',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        paymentStatus: PaymentStatus.PENDING,
        paymentIntentId: null,
        createdAt: originalDate,
        updatedAt: originalDate,
      };

      // Add order to the service's private array
      (service as any).orders = [mockOrder];

      const updateDto: UpdatePaymentStatusDto = {
        paymentStatus: PaymentStatus.COMPLETED,
        paymentIntentId: 'pi_123',
      };

      const result = await service.updatePaymentStatus('order-1', updateDto);

      expect(result.paymentStatus).toBe(PaymentStatus.COMPLETED);
      expect(result.paymentIntentId).toBe('pi_123');
      expect(result.status).toBe(OrderStatus.PROCESSING);
      expect(result.updatedAt.getTime()).toBeGreaterThan(originalDate.getTime());
    });

    it('should update order status to CANCELLED if payment fails', async () => {
      const originalDate = new Date('2024-01-01T00:00:00.000Z');
      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        items: [],
        totalAmount: 100,
        status: OrderStatus.PENDING,
        shippingAddress: 'Address 1',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        paymentStatus: PaymentStatus.PENDING,
        paymentIntentId: null,
        createdAt: originalDate,
        updatedAt: originalDate,
      };

      // Add order to the service's private array
      (service as any).orders = [mockOrder];

      const updateDto: UpdatePaymentStatusDto = {
        paymentStatus: PaymentStatus.FAILED,
      };

      const result = await service.updatePaymentStatus('order-1', updateDto);

      expect(result.paymentStatus).toBe(PaymentStatus.FAILED);
      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(result.updatedAt.getTime()).toBeGreaterThan(originalDate.getTime());
    });

    it('should not change order status if payment is completed but order is not pending', async () => {
      const originalDate = new Date('2024-01-01T00:00:00.000Z');
      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        items: [],
        totalAmount: 100,
        status: OrderStatus.PROCESSING,
        shippingAddress: 'Address 1',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        paymentStatus: PaymentStatus.PENDING,
        paymentIntentId: null,
        createdAt: originalDate,
        updatedAt: originalDate,
      };

      // Add order to the service's private array
      (service as any).orders = [mockOrder];

      const updateDto: UpdatePaymentStatusDto = {
        paymentStatus: PaymentStatus.COMPLETED,
        paymentIntentId: 'pi_123',
      };

      const result = await service.updatePaymentStatus('order-1', updateDto);

      expect(result.paymentStatus).toBe(PaymentStatus.COMPLETED);
      expect(result.paymentIntentId).toBe('pi_123');
      expect(result.status).toBe(OrderStatus.PROCESSING);
      expect(result.updatedAt.getTime()).toBeGreaterThan(originalDate.getTime());
    });

    it('should throw NotFoundException if order not found', async () => {
      // Empty orders array
      (service as any).orders = [];

      const updateDto: UpdatePaymentStatusDto = {
        paymentStatus: PaymentStatus.COMPLETED,
      };

      await expect(service.updatePaymentStatus('non-existent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel a pending order', async () => {
      const originalDate = new Date('2024-01-01T00:00:00.000Z');
      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        items: [],
        totalAmount: 100,
        status: OrderStatus.PENDING,
        shippingAddress: 'Address 1',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        paymentStatus: PaymentStatus.PENDING,
        paymentIntentId: null,
        createdAt: originalDate,
        updatedAt: originalDate,
      };

      // Add order to the service's private array
      (service as any).orders = [mockOrder];

      const result = await service.cancel('order-1');

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(result.updatedAt.getTime()).toBeGreaterThan(originalDate.getTime());
    });

    it('should throw BadRequestException if order is not pending', async () => {
      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        items: [],
        totalAmount: 100,
        status: OrderStatus.PROCESSING,
        shippingAddress: 'Address 1',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        paymentStatus: PaymentStatus.COMPLETED,
        paymentIntentId: 'pi_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add order to the service's private array
      (service as any).orders = [mockOrder];

      await expect(service.cancel('order-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if order not found', async () => {
      // Empty orders array
      (service as any).orders = [];

      await expect(service.cancel('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
}); 