import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { UpdateStockDto } from '../dto/update-stock.dto';

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
  private readonly adminToken: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.productServiceUrl = this.configService.get<string>('services.product');
    this.adminToken = this.configService.get<string>('services.adminToken');
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

  async decreaseStock(productId: string, quantity: number): Promise<void> {
    try {
      // First check if product exists and has enough stock
      const product = await firstValueFrom(
        this.httpService.get<ProductResponse>(`${this.productServiceUrl}/products/${productId}`, {
          headers: {
            Authorization: `Bearer ${this.adminToken}`,
          },
        }),
      );

      if (!product.data) {
        throw new HttpException(
          `Product with ID ${productId} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      if (product.data.stock < quantity) {
        throw new HttpException(
          `Insufficient stock for product ${productId}. Available: ${product.data.stock}, Requested: ${quantity}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Update the stock using the general update endpoint
      const newStock = product.data.stock - quantity;
      await firstValueFrom(
        this.httpService.patch<ProductResponse>(
          `${this.productServiceUrl}/products/${productId}`,
          { stock: newStock },
          {
            headers: {
              Authorization: `Bearer ${this.adminToken}`,
            },
          },
        ),
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to update stock for product ${productId}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
} 