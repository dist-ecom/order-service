import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ServiceAuthGuard implements CanActivate {
  private readonly serviceToken: string;

  constructor(private configService: ConfigService) {
    this.serviceToken = this.configService.get<string>('SERVICE_TOKEN');
    
    if (!this.serviceToken) {
      throw new Error('SERVICE_TOKEN environment variable is not set');
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];

    if (token !== this.serviceToken) {
      throw new UnauthorizedException('Invalid service token');
    }

    // Add service context to request
    request.user = {
      isService: true,
      serviceName: 'payment-service',
    };

    return true;
  }
} 