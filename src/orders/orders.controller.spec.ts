import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderStatus, PaymentStatus } from './entities/order.entity';
import { CreateOrderDto, PaymentMethod } from './dto/create-order.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Request } from 'express';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrdersService;

  const mockOrdersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByUser: jest.fn(),
    updateStatus: jest.fn(),
    updatePaymentStatus: jest.fn(),
    cancel: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get<OrdersService>(OrdersService);
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

    const mockOrder = {
      id: 'order-1',
      userId: mockUserId,
      items: mockCreateOrderDto.items,
      totalAmount: 46.97,
      status: OrderStatus.PENDING,
      shippingAddress: mockCreateOrderDto.shippingAddress,
      paymentMethod: mockCreateOrderDto.paymentMethod,
      paymentStatus: PaymentStatus.PENDING,
      paymentIntentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a new order', async () => {
      mockOrdersService.create.mockResolvedValue(mockOrder);

      const req = { user: { id: mockUserId } } as unknown as Request;
      const result = await controller.create(req, mockCreateOrderDto);

      expect(result).toEqual(mockOrder);
      expect(mockOrdersService.create).toHaveBeenCalledWith(mockCreateOrderDto, mockUserId);
    });
  });

  describe('findAll', () => {
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

    it('should return an array of orders', async () => {
      mockOrdersService.findAll.mockResolvedValue(mockOrders);

      const result = await controller.findAll();

      expect(result).toEqual(mockOrders);
      expect(mockOrdersService.findAll).toHaveBeenCalled();
    });
  });

  describe('findMyOrders', () => {
    const mockUserId = 'user-1';
    const mockUserOrders = [
      {
        id: 'order-1',
        userId: mockUserId,
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
        userId: mockUserId,
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

    it('should return orders for a specific user', async () => {
      mockOrdersService.findByUser.mockResolvedValue(mockUserOrders);

      const req = { user: { id: mockUserId } } as unknown as Request;
      const result = await controller.findMyOrders(req);

      expect(result).toEqual(mockUserOrders);
      expect(mockOrdersService.findByUser).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('findOne', () => {
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

    it('should return an order by id', async () => {
      mockOrdersService.findOne.mockResolvedValue(mockOrder);

      const result = await controller.findOne('order-1');

      expect(result).toEqual(mockOrder);
      expect(mockOrdersService.findOne).toHaveBeenCalledWith('order-1');
    });

    it('should throw NotFoundException if order not found', async () => {
      mockOrdersService.findOne.mockRejectedValue(new NotFoundException('Order not found'));

      await expect(controller.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update the status of an order', async () => {
      mockOrdersService.updateStatus.mockResolvedValue(mockOrder);

      const result = await controller.updateStatus('order-1', OrderStatus.PROCESSING);

      expect(result).toEqual(mockOrder);
      expect(mockOrdersService.updateStatus).toHaveBeenCalledWith('order-1', OrderStatus.PROCESSING);
    });

    it('should throw NotFoundException if order not found', async () => {
      mockOrdersService.updateStatus.mockRejectedValue(new NotFoundException('Order not found'));

      await expect(controller.updateStatus('non-existent', OrderStatus.PROCESSING)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updatePaymentStatus', () => {
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

    const updateDto: UpdatePaymentStatusDto = {
      paymentStatus: PaymentStatus.COMPLETED,
      paymentIntentId: 'pi_123',
    };

    it('should update the payment status of an order', async () => {
      mockOrdersService.updatePaymentStatus.mockResolvedValue(mockOrder);

      const result = await controller.updatePaymentStatus('order-1', updateDto);

      expect(result).toEqual(mockOrder);
      expect(mockOrdersService.updatePaymentStatus).toHaveBeenCalledWith('order-1', updateDto);
    });

    it('should throw NotFoundException if order not found', async () => {
      mockOrdersService.updatePaymentStatus.mockRejectedValue(new NotFoundException('Order not found'));

      await expect(controller.updatePaymentStatus('non-existent', updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    const mockOrder = {
      id: 'order-1',
      userId: 'user-1',
      items: [],
      totalAmount: 100,
      status: OrderStatus.CANCELLED,
      shippingAddress: 'Address 1',
      paymentMethod: PaymentMethod.CREDIT_CARD,
      paymentStatus: PaymentStatus.PENDING,
      paymentIntentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should cancel an order', async () => {
      mockOrdersService.cancel.mockResolvedValue(mockOrder);

      const result = await controller.cancel('order-1');

      expect(result).toEqual(mockOrder);
      expect(mockOrdersService.cancel).toHaveBeenCalledWith('order-1');
    });

    it('should throw NotFoundException if order not found', async () => {
      mockOrdersService.cancel.mockRejectedValue(new NotFoundException('Order not found'));

      await expect(controller.cancel('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if order cannot be cancelled', async () => {
      mockOrdersService.cancel.mockRejectedValue(
        new BadRequestException('Order cannot be cancelled in its current state'),
      );

      await expect(controller.cancel('order-1')).rejects.toThrow(BadRequestException);
    });
  });
}); 