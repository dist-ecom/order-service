import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ProductService } from './services/product.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule
  ],
  controllers: [OrdersController],
  providers: [OrdersService, ProductService],
  exports: [OrdersService],
})
export class OrdersModule {} 