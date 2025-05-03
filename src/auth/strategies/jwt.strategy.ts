import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private configService: ConfigService) {
    // First try to use the service-specific key, fall back to the shared secret
    const secret = configService.get<string>('jwt.orderServiceKey') || 
                   configService.get<string>('jwt.secret');
    
    if (!secret) {
      throw new Error('JWT secret is not configured. Please set JWT_SECRET or JWT_ORDER_SERVICE_KEY');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
    
    this.logger.log('JWT Strategy initialized with service-specific key');
  }

  async validate(payload: any) {
    return { 
      id: payload.sub, 
      username: payload.email, 
      role: payload.role 
    };
  }
} 