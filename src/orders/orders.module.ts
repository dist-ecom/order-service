import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { ProductService } from './services/product.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    HttpModule,
    ConfigModule
  ],
  controllers: [OrdersController],
  providers: [OrdersService, ProductService],
  exports: [OrdersService],
})
export class OrdersModule {} 