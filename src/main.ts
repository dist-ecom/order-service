import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import * as fs from 'fs';
import * as os from 'os';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'], // Enable debug logging
  });
  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);
  
  // Get application config
  const port = configService.get<number>('port') || 3000;
  const serviceName = configService.get<string>('SERVICE_NAME') || 'order-service';
  const serviceDescription = configService.get<string>('SERVICE_DESCRIPTION') || 'Order Management Service';
  const serviceRegistryUrl = configService.get<string>('services.registry');
  const rabbitmqUrl = configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672';

  // Connect to RabbitMQ for order events (publishing)
  const orderMs = app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: 'orders_queue',
      queueOptions: {
        durable: true,
      },
      noAck: false,
    },
  });

  // Connect to RabbitMQ for payment events (consuming)
  const paymentMs = app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: 'payments_queue',
      queueOptions: {
        durable: true,
      },
      noAck: false,
    },
  });

  // Start microservices
  await app.startAllMicroservices();
  logger.log('Microservice is listening on queues: orders_queue, payments_queue');

  // Enable validation pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // Enable CORS
  app.enableCors();

  // Set global prefix
  app.setGlobalPrefix('');

  // Setup Swagger
  if (configService.get<boolean>('SWAGGER_ENABLED')) {
    const config = new DocumentBuilder()
      .setTitle(serviceName)
      .setDescription(serviceDescription)
      .setVersion('1.0')
      .addBearerAuth()
      .build();
      
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('/api', app, document);
    
    // Save Swagger JSON to file
    fs.writeFileSync('./api-json.json', JSON.stringify(document, null, 2));
  }

  // Start the server
  await app.listen(port);

  // Register with service registry if configured
  if (serviceRegistryUrl) {
    try {
      const httpService = app.get(HttpService);
      
      // Get hostname and IP
      const hostname = os.hostname();
      const networkInterfaces = os.networkInterfaces();
      let ipAddress = '';
      
      // Find a suitable IP address (prefer non-internal IPv4)
      Object.keys(networkInterfaces).forEach((interfaceName) => {
        networkInterfaces[interfaceName].forEach((iface) => {
          if (iface.family === 'IPv4' && !iface.internal) {
            ipAddress = iface.address;
          }
        });
      });
      
      // If no external IP found, use localhost
      if (!ipAddress) {
        ipAddress = '127.0.0.1';
      }
      
      // In Docker, use the container name as the service address
      const serviceAddress = process.env.NODE_ENV === 'production' ? hostname : ipAddress;
      
      // Register service with Consul
      await httpService.put(`${serviceRegistryUrl}/v1/agent/service/register`, {
        ID: `${serviceName}-${hostname}`,
        Name: serviceName,
        Address: serviceAddress,
        Port: port,
        Check: {
          HTTP: `http://${serviceAddress}:${port}/health`,
          Interval: '15s',
          Timeout: '5s',
        },
        Tags: ['api', 'order-service', 'nestjs'],
        Meta: {
          Description: serviceDescription,
        },
      }).toPromise();
      
      logger.log(`Service registered with registry at ${serviceRegistryUrl}`);
      
      // Setup deregistration on app shutdown
      app.enableShutdownHooks();
      
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        try {
          await httpService.put(
            `${serviceRegistryUrl}/v1/agent/service/deregister/${serviceName}-${hostname}`
          ).toPromise();
          logger.log('Service deregistered from registry');
          process.exit(0);
        } catch (error) {
          logger.error('Failed to deregister service', error);
          process.exit(1);
        }
      });
    } catch (error) {
      logger.error('Failed to register service with registry', error);
    }
  }
  
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`SERVICE_TOKEN is ${configService.get<string>('SERVICE_TOKEN') ? 'configured' : 'NOT configured'}`);
}

bootstrap();
