import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ProductService } from './services/product.service';
import { ServiceDiscoveryModule } from '../service-discovery/service-discovery.module';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';
import { AuthModule } from '../auth/auth.module';
import { ServiceAuthGuard } from '../auth/guards/service-auth.guard';
import { UserOrServiceGuard } from '../auth/guards/user-or-service.guard';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    ServiceDiscoveryModule,
    forwardRef(() => RabbitmqModule),
    AuthModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, ProductService, ServiceAuthGuard, UserOrServiceGuard],
  exports: [OrdersService],
})
export class OrdersModule {} 