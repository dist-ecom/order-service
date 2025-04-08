import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);
  
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    this.logger.debug(`User: ${JSON.stringify(user)}`);
    this.logger.debug(`Required roles: ${roles}`);
    
    // Check if user has the required role
    // The role in the JWT is stored as 'role' (singular)
    const hasRole = roles.includes(user.role);
    this.logger.debug(`Has required role: ${hasRole}`);
    
    return hasRole;
  }
} 