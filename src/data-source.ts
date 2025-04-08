import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { Order } from './orders/entities/order.entity';
import { CreateOrdersTable1710000000000 } from './migrations/1710000000000-CreateOrdersTable';

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
  migrations: [CreateOrdersTable1710000000000],
  synchronize: false,
}); 