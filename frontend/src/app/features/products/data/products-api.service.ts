import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../../../core/api/api.config';
import { PagedResponse } from '../../../core/models/paged-response.model';
import { withIdempotencyKey } from '../../../core/http/idempotency.interceptor';
import { CreateProductRequest } from '../models/create-product-request.model';
import { Product } from '../models/product.model';
import { UpdateProductRequest } from '../models/update-product-request.model';

@Injectable({ providedIn: 'root' })
export class ProductsApiService {
  private readonly http = inject(HttpClient);
  private readonly productsUrl = `${API_CONFIG.baseUrl}/products`;

  list(): Observable<PagedResponse<Product>> {
    return this.http.get<PagedResponse<Product>>(this.productsUrl);
  }

  getById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.productsUrl}/${id}`);
  }

  create(payload: CreateProductRequest, idempotencyKey?: string): Observable<Product> {
    return this.http.post<Product>(this.productsUrl, payload, {
      context: withIdempotencyKey(idempotencyKey)
    });
  }

  update(id: string, payload: UpdateProductRequest): Observable<Product> {
    return this.http.put<Product>(`${this.productsUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.productsUrl}/${id}`);
  }
}