import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { AxiosHeaders } from 'axios';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('ProductService', () => {
  let service: ProductService;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockProductServiceUrl = 'http://product-service:3001';
  const mockHttpService = {
    get: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'services.product') {
        return mockProductServiceUrl;
      }
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateProduct', () => {
    const mockProductId = 'product-1';
    const mockProduct = {
      _id: mockProductId,
      name: 'Product 1',
      price: 10.99,
      description: 'Test product',
      category: 'Test category',
      tags: ['test'],
      images: ['test.jpg'],
      isActive: true,
      stock: 10,
      metadata: {},
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    };

    it('should validate a product and return its details', async () => {
      const mockResponse: AxiosResponse = {
        data: mockProduct,
        status: 200,
        statusText: 'OK',
        headers: new AxiosHeaders(),
        config: {
          headers: new AxiosHeaders(),
        },
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.validateProduct(mockProductId);

      expect(result).toEqual({
        price: mockProduct.price,
        name: mockProduct.name,
      });
      expect(mockHttpService.get).toHaveBeenCalledWith(
        `${mockProductServiceUrl}/products/${mockProductId}`,
      );
    });

    it('should throw an error if the product is not active', async () => {
      const inactiveProduct = { ...mockProduct, isActive: false };
      const mockResponse: AxiosResponse = {
        data: inactiveProduct,
        status: 200,
        statusText: 'OK',
        headers: new AxiosHeaders(),
        config: {
          headers: new AxiosHeaders(),
        },
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      await expect(service.validateProduct(mockProductId)).rejects.toThrow(
        `Product with ID ${mockProductId} is not available`,
      );
    });

    it('should throw an error if the product service request fails', async () => {
      mockHttpService.get.mockReturnValue(throwError(() => new HttpException('Product service error', HttpStatus.INTERNAL_SERVER_ERROR)));

      await expect(service.validateProduct(mockProductId)).rejects.toThrow('Product service error');
    });
  });

  describe('validateProducts', () => {
    const mockProductServiceUrl = 'http://product-service:3001';
    const mockProductIds = ['product-1', 'product-2'];
    const mockProducts = [
      {
        _id: 'product-1',
        name: 'Product 1',
        price: 10.99,
        description: 'Test product 1',
        category: 'Test category',
        tags: ['test'],
        images: ['test1.jpg'],
        isActive: true,
        stock: 10,
        metadata: {},
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
      {
        _id: 'product-2',
        name: 'Product 2',
        price: 24.99,
        description: 'Test product 2',
        category: 'Test category',
        tags: ['test'],
        images: ['test2.jpg'],
        isActive: true,
        stock: 10,
        metadata: {},
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
    ];

    it('should validate multiple products and return a map of product IDs to product details', async () => {
      // Mock the validateProduct method for each product ID
      jest.spyOn(service, 'validateProduct').mockImplementation(async (productId) => {
        const product = mockProducts.find(p => p._id === productId);
        if (!product) {
          throw new HttpException(
            `Product with ID ${productId} is not available`,
            HttpStatus.NOT_FOUND,
          );
        }
        return {
          price: product.price,
          name: product.name,
        };
      });

      const result = await service.validateProducts(mockProductIds);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.get('product-1')).toEqual({
        price: mockProducts[0].price,
        name: mockProducts[0].name,
      });
      expect(result.get('product-2')).toEqual({
        price: mockProducts[1].price,
        name: mockProducts[1].name,
      });
    });

    it('should throw an error if one of the products is not available', async () => {
      // Mock the validateProduct method to throw an error for the second product
      jest.spyOn(service, 'validateProduct').mockImplementation(async (productId) => {
        if (productId === 'product-2') {
          throw new HttpException(
            `Product with ID ${productId} is not available`,
            HttpStatus.NOT_FOUND,
          );
        }
        const product = mockProducts.find(p => p._id === productId);
        return {
          price: product.price,
          name: product.name,
        };
      });

      await expect(service.validateProducts(mockProductIds)).rejects.toThrow(
        `Product with ID product-2 is not available`,
      );
    });
  });
}); 