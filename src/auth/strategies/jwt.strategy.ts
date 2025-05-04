import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private configService: ConfigService) {
    // Use only the shared JWT secret for compatibility with other services
    const secret = configService.get<string>('jwt.secret');
    
    if (!secret) {
      throw new Error('JWT secret is not configured. Please set JWT_SECRET');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
    
    this.logger.log('JWT Strategy initialized with shared secret');
  }

  async validate(payload: any) {
    return { 
      id: payload.sub, 
      username: payload.email, 
      role: payload.role 
    };
  }
} 