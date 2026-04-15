import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_CONFIG } from '../../../core/api/api.config';
import { PagedResponse } from '../../../core/models/paged-response.model';
import { withIdempotencyKey } from '../../../core/http/idempotency.interceptor';
import { CreateProductRequest } from '../models/create-product-request.model';
import { Product } from '../models/product.model';
import { UpdateProductRequest } from '../models/update-product-request.model';

type ProductApiResponse = Omit<Product, 'availableQuantity'> & {
  availableQuantity?: number;
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
    return {
      ...product,
      availableQuantity: product.availableQuantity ?? product.stock,
    };
  }
}