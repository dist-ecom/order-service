import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ServiceAuthGuard } from './service-auth.guard';
import { Observable, firstValueFrom, isObservable } from 'rxjs';

@Injectable()
export class UserOrServiceGuard implements CanActivate {
  private readonly logger = new Logger(UserOrServiceGuard.name);
  
  constructor(
    private jwtAuthGuard: JwtAuthGuard,
    private serviceAuthGuard: ServiceAuthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      this.logger.warn('No authorization header found');
      return false;
    }

    // Try service auth first
    try {
      const serviceAuthResult = this.serviceAuthGuard.canActivate(context);
      
      // Handle both synchronous boolean and Observable<boolean> return types
      if (isObservable(serviceAuthResult)) {
        const result = await firstValueFrom(serviceAuthResult);
        if (result) {
          request.user = { isService: true };
          return true;
        }
      } else if (serviceAuthResult === true) {
        request.user = { isService: true };
        return true;
      }
    } catch (serviceError) {
      this.logger.debug('Service authentication failed, trying JWT authentication');
      // Just log and continue to JWT auth
    }
    
    // If service auth fails, try JWT auth
    try {
      const jwtAuthResult = this.jwtAuthGuard.canActivate(context);
      
      // Handle both synchronous boolean and Observable<boolean> return types
      if (isObservable(jwtAuthResult)) {
        return await firstValueFrom(jwtAuthResult);
      }
      
      return jwtAuthResult;
    } catch (jwtError) {
      this.logger.error(`JWT authentication failed: ${jwtError.message}`);
      return false;
    }
  }
} 