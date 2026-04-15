import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../../../core/api/api.config';
import { withIdempotencyKey } from '../../../core/http/idempotency.interceptor';

export interface InvoicePayload {
  customer: string;
  issueDate: string;
}

export interface ManageInvoiceItemsPayload {
  items: Array<{
    productId: number;
    quantity: number;
  }>;
}

@Injectable({ providedIn: 'root' })
export class InvoicesApiService {
  private readonly http = inject(HttpClient);
  private readonly invoicesUrl = `${API_CONFIG.baseUrl}/invoices`;

  list(): Observable<unknown> {
    return this.http.get(this.invoicesUrl);
  }

  getById(id: string | number): Observable<unknown> {
    return this.http.get(`${this.invoicesUrl}/${id}`);
  }

  create(payload: InvoicePayload, idempotencyKey?: string): Observable<unknown> {
    return this.http.post(this.invoicesUrl, payload, {
      context: withIdempotencyKey(idempotencyKey)
    });
  }

  update(id: string | number, payload: InvoicePayload): Observable<unknown> {
    return this.http.put(`${this.invoicesUrl}/${id}`, payload);
  }

  updateItems(id: string | number, payload: ManageInvoiceItemsPayload): Observable<unknown> {
    return this.http.patch(`${this.invoicesUrl}/${id}/items`, payload);
  }

  removeProduct(invoiceId: string | number, productId: string | number): Observable<void> {
    return this.http.delete<void>(`${this.invoicesUrl}/${invoiceId}/product/${productId}`);
  }

  close(id: string | number, idempotencyKey?: string): Observable<unknown> {
    return this.http.put(
      `${this.invoicesUrl}/${id}/close`,
      {},
      {
        context: withIdempotencyKey(idempotencyKey)
      }
    );
  }
}