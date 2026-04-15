import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../../../core/api/api.config';
import { withIdempotencyKey } from '../../../core/http/idempotency.interceptor';

export interface ProductPayload {
  name: string;
  sku: string;
  unitPrice: number;
  stockQuantity: number;
}

@Injectable({ providedIn: 'root' })
export class ProductsApiService {
  private readonly http = inject(HttpClient);
  private readonly productsUrl = `${API_CONFIG.baseUrl}/products`;

  list(): Observable<unknown> {
    return this.http.get(this.productsUrl);
  }

  getById(id: string | number): Observable<unknown> {
    return this.http.get(`${this.productsUrl}/${id}`);
  }

  create(payload: ProductPayload, idempotencyKey?: string): Observable<unknown> {
    return this.http.post(this.productsUrl, payload, {
      context: withIdempotencyKey(idempotencyKey)
    });
  }

  update(id: string | number, payload: ProductPayload): Observable<unknown> {
    return this.http.put(`${this.productsUrl}/${id}`, payload);
  }

  delete(id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.productsUrl}/${id}`);
  }
}