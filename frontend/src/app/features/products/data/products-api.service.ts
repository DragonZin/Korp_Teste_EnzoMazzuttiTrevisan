import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_CONFIG } from '../../../core/api/api.config';
import { PagedResponse } from '../../../core/models/paged-response.model';
import { withIdempotencyKey } from '../../../core/http/idempotency.interceptor';
import { CreateProductRequest } from '../models/create-product-request.model';
import { Product, ProductApiResponse } from '../models/product.model';
import { UpdateProductRequest } from '../models/update-product-request.model';

type GetProductsByIdsRequest = {
  ids: string[];
};

@Injectable({ providedIn: 'root' })
export class ProductsApiService {
  private readonly http = inject(HttpClient);
  private readonly productsUrl = `${API_CONFIG.baseUrl}/products`;

  list(page = 1, pageSize = 25): Observable<PagedResponse<Product>> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    return this.http.get<PagedResponse<ProductApiResponse>>(this.productsUrl, { params }).pipe(
      map((response) => ({
        ...response,
        items: response.items.map((item) => this.normalizeProduct(item)),
      }))
    );
  }

  getById(id: string): Observable<Product> {
    return this.http
      .get<ProductApiResponse>(`${this.productsUrl}/${id}`)
      .pipe(map((response) => this.normalizeProduct(response)));
  }

  getByIds(ids: string[]): Observable<Product[]> {
    const payload: GetProductsByIdsRequest = { ids };

    return this.http
      .post<ProductApiResponse[]>(`${this.productsUrl}/batch`, payload)
      .pipe(map((response) => response.map((product) => this.normalizeProduct(product))));
  }

  create(payload: CreateProductRequest, idempotencyKey?: string): Observable<Product> {
    return this.http.post<ProductApiResponse>(this.productsUrl, payload, {
      context: withIdempotencyKey(idempotencyKey)
    }).pipe(map((response) => this.normalizeProduct(response)));
  }

  update(id: string, payload: UpdateProductRequest): Observable<Product> {
    return this.http
      .put<ProductApiResponse>(`${this.productsUrl}/${id}`, payload)
      .pipe(map((response) => this.normalizeProduct(response)));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.productsUrl}/${id}`);
  }

  private normalizeProduct(product: ProductApiResponse): Product {
    const parsedPrice =
      typeof product.price === 'string'
        ? this.parsePrice(product.price)
        : product.price;

    const normalizedPrice = Number.isFinite(parsedPrice) ? Number(parsedPrice) : 0;

    return {
      ...product,
      price: normalizedPrice,
      availableQuantity: product.availableQuantity ?? product.stock,
    };
  }

  private parsePrice(price: string): number {
    const trimmedPrice = price.trim();

    if (trimmedPrice.length === 0) {
      return Number.NaN;
    }

    if (trimmedPrice.includes(',') && trimmedPrice.includes('.')) {
      return Number(trimmedPrice.replace(/\./g, '').replace(',', '.'));
    }

    return Number(trimmedPrice.replace(',', '.'));
  }
}