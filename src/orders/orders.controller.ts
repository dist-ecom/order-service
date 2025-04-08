import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { Order, OrderStatus } from './entities/order.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'The order has been successfully created.', type: Order })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async create(@Request() req, @Body() createOrderDto: CreateOrderDto): Promise<Order> {
    return this.ordersService.create(createOrderDto, req.user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get all orders' })
  @ApiResponse({ status: 200, description: 'Return all orders.', type: [Order] })
  async findAll(): Promise<Order[]> {
    return this.ordersService.findAll();
  }

  @Get('my-orders')
  @ApiOperation({ summary: 'Get user orders' })
  @ApiResponse({ status: 200, description: 'Return user orders.', type: [Order] })
  async findMyOrders(@Request() req): Promise<Order[]> {
    return this.ordersService.findByUser(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by id' })
  @ApiResponse({ status: 200, description: 'Return the order.', type: Order })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async findOne(@Param('id') id: string): Promise<Order> {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Update order status' })
  @ApiResponse({ status: 200, description: 'The order status has been updated.', type: Order })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
  ): Promise<Order> {
    return this.ordersService.updateStatus(id, status);
  }

  @Patch(':id/payment-status')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Update order payment status' })
  @ApiResponse({ status: 200, description: 'The order payment status has been updated.', type: Order })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body() updatePaymentStatusDto: UpdatePaymentStatusDto,
  ): Promise<Order> {
    return this.ordersService.updatePaymentStatus(id, updatePaymentStatusDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel order' })
  @ApiResponse({ status: 200, description: 'The order has been cancelled.', type: Order })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async cancel(@Param('id') id: string): Promise<Order> {
    return this.ordersService.cancel(id);
  }
} 