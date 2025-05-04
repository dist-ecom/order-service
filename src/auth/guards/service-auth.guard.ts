import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ServiceAuthGuard implements CanActivate {
  private readonly serviceToken: string;
  private readonly logger = new Logger(ServiceAuthGuard.name);

  constructor(private configService: ConfigService) {
    this.serviceToken = this.configService.get<string>('SERVICE_TOKEN');
    
    if (!this.serviceToken) {
      throw new Error('SERVICE_TOKEN environment variable is not set');
    }
    
    this.logger.log(`ServiceAuthGuard initialized with token length: ${this.serviceToken.length}`);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    this.logger.debug(`Auth header: ${authHeader ? 'present' : 'missing'}`);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn('Missing or invalid authorization header');
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];
    
    this.logger.debug(`Received token length: ${token.length}`);
    this.logger.debug(`Expected token length: ${this.serviceToken.length}`);
    this.logger.debug(`Tokens match: ${this.serviceToken.includes(token.substring(0, 10)) || token.includes(this.serviceToken.substring(0, 10))}`);

    if (!this.serviceToken.includes(token.substring(0, 10)) && !token.includes(this.serviceToken.substring(0, 10))) {
      this.logger.warn('Invalid service token received');
      throw new UnauthorizedException('Invalid service token');
    }

    // Add service context to request
    request.user = {
      isService: true,
      serviceName: 'payment-service',
    };

    this.logger.log('Service authentication successful');
    return true;
  }
} 