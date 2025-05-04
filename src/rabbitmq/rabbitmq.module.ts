import { Module, forwardRef } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitmqService } from './rabbitmq.service';
import { PaymentsConsumer } from './consumers/payments.consumer';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_CLIENT',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672'],
            queue: 'orders_queue',
            queueOptions: {
              durable: true,
            },
            serializer: {
              serialize: (value: any) => {
                // Convert BigInt values to strings and ensure consistent data format
                const serialized = JSON.stringify(value, (_, v) => 
                  typeof v === 'bigint' ? v.toString() : v
                );
                return serialized;
              }
            }
          },
        }),
        inject: [ConfigService],
      },
    ]),
    forwardRef(() => OrdersModule),
  ],
  providers: [RabbitmqService, PaymentsConsumer],
  exports: [RabbitmqService],
})
export class RabbitmqModule {} 