import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

interface ProductResponse {
  _id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  tags: string[];
  images: string[];
  isActive: boolean;
  stock: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ProductService {
  private readonly productServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.productServiceUrl = this.configService.get<string>('services.product');
  }

  async validateProduct(productId: string): Promise<{ price: number; name: string }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<ProductResponse>(`${this.productServiceUrl}/products/${productId}`),
      );
      
      if (!response.data || !response.data.isActive) {
        throw new HttpException(
          `Product with ID ${productId} is not available`,
          HttpStatus.NOT_FOUND,
        );
      }
      
      return {
        price: response.data.price,
        name: response.data.name,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Product with ID ${productId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async validateProducts(productIds: string[]): Promise<Map<string, { price: number; name: string }>> {
    const productMap = new Map();
    await Promise.all(
      productIds.map(async (productId) => {
        const product = await this.validateProduct(productId);
        productMap.set(productId, product);
      }),
    );
    return productMap;
  }
} 