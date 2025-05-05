import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Request, Req, Query, BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderItem } from './entities/order.entity';
import { Order, OrderStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ServiceAuthGuard } from '../auth/guards/service-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { UserOrServiceGuard } from '../auth/guards/user-or-service.guard';
import { CreateDraftOrderDto } from './dto/create-draft-order.dto';

// Define a type for API responses to satisfy Swagger
class OrderResponse {
  id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: string;
  shippingAddress?: string;
  trackingNumber?: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentIntentId?: string;
  currency?: string;
  metadata?: any;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Helper function to cast Order to OrderResponse
function castToOrderResponse(order: any): OrderResponse {
  return {
    ...order,
    items: order.items as unknown as OrderItem[]
  } as OrderResponse;
}

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'The order has been successfully created.', type: OrderResponse })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async create(@Request() req, @Body() createOrderDto: CreateOrderDto): Promise<OrderResponse> {
    const order = await this.ordersService.create(createOrderDto, req.user.id);
    return castToOrderResponse(order);
  }

  @Post('draft')
  @ApiOperation({ summary: 'Create a draft order (part of checkout flow)' })
  @ApiResponse({ status: 201, description: 'Draft order created successfully' })
  createDraft(@Body() createDraftOrderDto: CreateDraftOrderDto) {
    return this.ordersService.createDraft(createDraftOrderDto);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm a draft order after successful payment' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order confirmed successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  confirmOrder(
    @Param('id') id: string,
    @Body() confirmData: {
      paymentIntentId: string;
      paymentMethodId?: string;
      customerDetails?: any;
    },
  ) {
    return this.ordersService.confirmOrder(id, confirmData);
  }

  @Post(':id/expire')
  @ApiOperation({ summary: 'Mark a draft order as expired' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order marked as expired' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  expireOrder(@Param('id') id: string) {
    return this.ordersService.expireOrder(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get all orders' })
  @ApiResponse({ status: 200, description: 'Return all orders.', type: [OrderResponse] })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by order status' })
  async findAll(@Req() req, @Query('status') status?: string): Promise<OrderResponse[]> {
    const orders = await this.ordersService.findAll(req.user.id, status);
    return orders.map(order => castToOrderResponse(order));
  }

  @Get('my-orders')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user orders' })
  @ApiResponse({ status: 200, description: 'Return user orders.', type: [OrderResponse] })
  async findMyOrders(@Request() req): Promise<OrderResponse[]> {
    const orders = await this.ordersService.findByUser(req.user.id);
    return orders.map(order => castToOrderResponse(order));
  }

  @Get(':id')
  @UseGuards(UserOrServiceGuard)
  @ApiOperation({ summary: 'Get order by id' })
  @ApiResponse({ status: 200, description: 'Return the order.', type: OrderResponse })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async findOne(@Param('id') id: string, @Request() req): Promise<OrderResponse> {
    let order;
    // If the request is from a user, check that they own the order or are an admin
    if (req.user && !req.user.isService) {
      order = await this.ordersService.findOneForUser(id, req.user.id, req.user.role === 'admin');
    } else {
      // Service requests can access any order
      order = await this.ordersService.findOne(id);
    }
    return castToOrderResponse(order);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ 
    summary: 'Update order status',
    description: 'Update the status of an order. When status is changed to SHIPPED, the product stock will be decreased accordingly.'
  })
  @ApiBody({ type: UpdateOrderStatusDto })
  @ApiResponse({ 
    status: 200, 
    description: 'The order status has been updated. If status is SHIPPED, product stock has been decreased.', 
    type: OrderResponse 
  })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden. User does not have admin role.' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<OrderResponse> {
    const order = await this.ordersService.updateStatus(id, updateOrderStatusDto.status);
    return castToOrderResponse(order);
  }

  @Patch(':id/payment-status')
  @UseGuards(ServiceAuthGuard)
  @ApiOperation({ summary: 'Update order payment status' })
  @ApiResponse({ status: 200, description: 'The order payment status has been updated.', type: OrderResponse })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Invalid service token.' })
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body() updatePaymentStatusDto: UpdatePaymentStatusDto,
  ): Promise<OrderResponse> {
    const order = await this.ordersService.updatePaymentStatus(id, updatePaymentStatusDto);
    return castToOrderResponse(order);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel order' })
  @ApiResponse({ status: 200, description: 'The order has been cancelled.', type: OrderResponse })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async cancel(@Param('id') id: string): Promise<OrderResponse> {
    const order = await this.ordersService.cancel(id);
    return castToOrderResponse(order);
  }

  @Get(':id/details')
  @ApiOperation({ summary: 'Get order details for service-to-service communication' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Returns the order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  getOrderDetails(@Param('id') id: string) {
    return this.ordersService.getOrderDetails(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update an order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order updated successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto, @Req() req) {
    return this.ordersService.update(id, updateOrderDto, req.user.id);
  }
} 