import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { Order } from './orders/entities/order.entity';
import { CreateOrdersTable1710000000000 } from './migrations/1710000000000-CreateOrdersTable';
import { AddTrackingNumberColumn1710000000001 } from './migrations/1710000000001-AddTrackingNumberColumn';
import { FixTrackingNumberColumn1710000000002 } from './migrations/1710000000002-FixTrackingNumberColumn';
import { AddPaymentStatusColumn1710000000003 } from './migrations/1710000000003-AddPaymentStatusColumn';
import { AddPaymentIntentIdColumn1710000000004 } from './migrations/1710000000004-AddPaymentIntentIdColumn';

config();

const configService = new ConfigService();

export default new DataSource({
  type: 'postgres',
  host: configService.get('DB_HOST'),
  port: configService.get('DB_PORT'),
  username: configService.get('DB_USERNAME'),
  password: configService.get('DB_PASSWORD'),
  database: configService.get('DB_DATABASE'),
  entities: [Order],
  migrations: [
    CreateOrdersTable1710000000000,
    AddTrackingNumberColumn1710000000001,
    FixTrackingNumberColumn1710000000002,
    AddPaymentStatusColumn1710000000003,
    AddPaymentIntentIdColumn1710000000004
  ],
  synchronize: false,
}); 