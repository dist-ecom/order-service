import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ProductService } from './services/product.service';
import { ServiceDiscoveryModule } from '../service-discovery/service-discovery.module';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    ServiceDiscoveryModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, ProductService],
  exports: [OrdersService],
})
export class OrdersModule {} 