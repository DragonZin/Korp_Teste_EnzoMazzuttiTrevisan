import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_CONFIG } from '../../../core/api/api.config';
import { ProductsApiService } from './products-api.service';

describe('ProductsApiService', () => {
  let service: ProductsApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ProductsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should normalize missing price as 0 and fallback availableQuantity to stock', () => {
    service.list().subscribe((response) => {
      expect(response.items[0].price).toBe(0);
      expect(response.items[0].availableQuantity).toBe(20);
    });

    const req = httpMock.expectOne((request) => request.url === `${API_CONFIG.baseUrl}/products`);
    expect(req.request.method).toBe('GET');

    req.flush({
      page: 1,
      pageSize: 25,
      totalItems: 1,
      totalPages: 1,
      items: [
        {
          id: 'product-1',
          code: 'ABC-123',
          name: 'Produto sem preço',
          stock: 20,
          price: null,
          availableQuantity: null,
        },
      ],
    });
  });

  it('should normalize string price values to numbers', () => {
    service.getById('product-2').subscribe((product) => {
      expect(product.price).toBe(12.5);
    });

    const req = httpMock.expectOne(`${API_CONFIG.baseUrl}/products/product-2`);
    expect(req.request.method).toBe('GET');

    req.flush({
      id: 'product-2',
      code: 'XYZ-456',
      name: 'Produto com preço string',
      stock: 3,
      price: '12.50',
      availableQuantity: 1,
    });
  });

  it('should normalize localized string price values to numbers', () => {
    service.getById('product-3').subscribe((product) => {
      expect(product.price).toBe(1234.56);
    });

    const req = httpMock.expectOne(`${API_CONFIG.baseUrl}/products/product-3`);
    expect(req.request.method).toBe('GET');

    req.flush({
      id: 'product-3',
      code: 'PTB-789',
      name: 'Produto com preço local',
      stock: 8,
      price: '1.234,56',
      availableQuantity: 2,
    });
  });
});