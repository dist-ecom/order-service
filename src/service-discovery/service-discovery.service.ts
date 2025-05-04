import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ServiceDiscoveryService {
  private readonly logger = new Logger(ServiceDiscoveryService.name);
  private readonly serviceCache: Map<string, string> = new Map();
  private readonly serviceCacheTTL: number = 60000; // 1 minute in milliseconds
  private readonly serviceRegistry: string;
  private readonly fallbackServiceUrls: { [key: string]: string };
  
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.serviceRegistry = this.configService.get<string>('services.registry');
    
    // Fallback to environment variables if service discovery fails
    this.fallbackServiceUrls = {
      'product-service': this.configService.get<string>('services.product'),
      'user-service': this.configService.get<string>('services.user'),
      'payment-service': this.configService.get<string>('services.payment'),
    };
    
    this.logger.log(`Service discovery initialized with registry: ${this.serviceRegistry}`);
  }
  
  async getServiceUrl(serviceName: string): Promise<string> {
    // Check cache first
    const cachedUrl = this.getFromCache(serviceName);
    if (cachedUrl) {
      return cachedUrl;
    }
    
    // If service registry is not configured, use fallback
    if (!this.serviceRegistry) {
      const fallbackUrl = this.fallbackServiceUrls[serviceName];
      this.logger.warn(`Service registry not configured, using fallback URL for ${serviceName}: ${fallbackUrl}`);
      return fallbackUrl;
    }
    
    try {
      // Query service registry
      const response = await firstValueFrom(
        this.httpService.get(`${this.serviceRegistry}/v1/catalog/service/${serviceName}`),
      );
      
      if (response.data && response.data.length > 0) {
        // Get the first healthy instance
        const instance = response.data.find(svc => 
          svc.Checks && Array.isArray(svc.Checks) 
            ? svc.Checks.every(check => check.Status === 'passing')
            : true  // If no checks, assume it's healthy
        );
        
        if (instance) {
          const serviceUrl = `http://${instance.ServiceAddress}:${instance.ServicePort}`;
          this.setCache(serviceName, serviceUrl);
          return serviceUrl;
        }
      }
      
      this.logger.warn(`No healthy instances found for ${serviceName}, using fallback URL`);
      return this.fallbackServiceUrls[serviceName];
    } catch (error) {
      this.logger.error(`Error discovering service ${serviceName}: ${error.message}`);
      return this.fallbackServiceUrls[serviceName];
    }
  }
  
  private getFromCache(serviceName: string): string | null {
    const cacheEntry = this.serviceCache.get(serviceName);
    if (!cacheEntry) return null;
    
    const [url, timestamp] = cacheEntry.split('|');
    const cacheTime = parseInt(timestamp, 10);
    
    if (Date.now() - cacheTime > this.serviceCacheTTL) {
      this.serviceCache.delete(serviceName);
      return null;
    }
    
    return url;
  }
  
  private setCache(serviceName: string, url: string): void {
    this.serviceCache.set(serviceName, `${url}|${Date.now()}`);
  }
} 