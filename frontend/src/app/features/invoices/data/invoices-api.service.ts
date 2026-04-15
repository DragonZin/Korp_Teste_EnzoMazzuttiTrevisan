import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../../../core/api/api.config';
import { PagedResponse } from '../../../core/models/paged-response.model';
import { withIdempotencyKey } from '../../../core/http/idempotency.interceptor';
import { CreateInvoiceRequest } from '../models/create-invoice-request.model';
import { Invoice } from '../models/invoice.model';
import { ManageInvoiceItemsRequest } from '../models/manage-invoice-items-request.model';
import { UpdateInvoiceRequest } from '../models/update-invoice-request.model';

@Injectable({ providedIn: 'root' })
export class InvoicesApiService {
  private readonly http = inject(HttpClient);
  private readonly invoicesUrl = `${API_CONFIG.baseUrl}/invoices`;

  list(params?: { page?: number; pageSize?: number; status?: 1 | 2 }): Observable<PagedResponse<Invoice>> {
    let httpParams = new HttpParams();

    if (params?.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }

    if (params?.pageSize) {
      httpParams = httpParams.set('pageSize', params.pageSize.toString());
    }

    if (params?.status) {
      httpParams = httpParams.set('status', params.status.toString());
    }

    return this.http.get<PagedResponse<Invoice>>(this.invoicesUrl, { params: httpParams });
  }

  getById(id: string): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.invoicesUrl}/${id}`);
  }

  create(payload: CreateInvoiceRequest, idempotencyKey?: string): Observable<Invoice> {
    return this.http.post<Invoice>(this.invoicesUrl, payload, {
      context: withIdempotencyKey(idempotencyKey)
    });
  }

  update(id: string, payload: UpdateInvoiceRequest): Observable<Invoice> {
    return this.http.put<Invoice>(`${this.invoicesUrl}/${id}`, payload);
  }

  updateItems(id: string, payload: ManageInvoiceItemsRequest): Observable<Invoice> {
    return this.http.patch<Invoice>(`${this.invoicesUrl}/${id}/items`, payload);
  }

  removeProduct(invoiceId: string, productId: string): Observable<void> {
    return this.http.delete<void>(`${this.invoicesUrl}/${invoiceId}/product/${productId}`);
  }

  close(id: string, idempotencyKey?: string): Observable<Invoice> {
    return this.http.put<Invoice>(
      `${this.invoicesUrl}/${id}/close`,
      {},
      {
        context: withIdempotencyKey(idempotencyKey)
      }
    );
  }
}