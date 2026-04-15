import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { mapHttpErrorMessage } from '../../../core/http/http-error-mapper';
import { Invoice } from '../models/invoice.model';
import { InvoicesApiService } from './invoices-api.service';

export interface InvoiceItemsFacadeResult {
  success: boolean;
  message?: string;
  errorMessage?: string;
  updatedInvoice?: Invoice;
  editableQuantity?: number;
  shouldReloadInvoice?: boolean;
  noChanges?: boolean;
}

@Injectable({ providedIn: 'root' })
export class InvoiceItemsFacade {
  private readonly invoicesApiService = inject(InvoicesApiService);

  updateItems(invoice: Invoice | null, productId: string, rawQuantity: string | number): Observable<InvoiceItemsFacadeResult> {
    const invoiceValidation = this.validateInvoiceCanManageItems(invoice);
    if (!invoiceValidation.success || !invoiceValidation.invoice) {
      return of(invoiceValidation);
    }

    const item = invoiceValidation.invoice.products.find((product) => product.productId === productId);
    if (!item) {
      return of({
        success: false,
        errorMessage: 'Produto não encontrado na nota fiscal.'
      });
    }

    const quantityValidation = this.validateQuantity(rawQuantity);

    if (!quantityValidation.success) {
      return of({
        success: false,
        errorMessage: quantityValidation.errorMessage,
        editableQuantity: item.quantity
      });
    }

    if (quantityValidation.quantity === item.quantity) {
      return of({
        success: true,
        editableQuantity: item.quantity,
        noChanges: true
      });
    }

    return this.invoicesApiService
      .updateItems(invoiceValidation.invoice.id, {
        products: [{ productId, quantity: quantityValidation.quantity }]
      })
      .pipe(
        map((updatedInvoice) => ({
          success: true,
          message: 'Quantidade do produto atualizada com sucesso.',
          updatedInvoice,
          editableQuantity: quantityValidation.quantity
        })),
        catchError((error: HttpErrorResponse) => of({
          success: false,
          errorMessage: this.getFriendlyErrorMessage(error)
        }))
      );
  }

  removeProduct(invoice: Invoice | null, productId: string): Observable<InvoiceItemsFacadeResult> {
    const validation = this.validateInvoiceCanManageItems(invoice);
    if (!validation.success || !validation.invoice) {
      return of(validation);
    }

    return this.invoicesApiService.removeProduct(validation.invoice.id, productId).pipe(
      map(() => ({
        success: true,
        message: 'Produto removido da nota fiscal com sucesso.',
        shouldReloadInvoice: true
      })),
      catchError((error: HttpErrorResponse) => of({
        success: false,
        errorMessage: this.getFriendlyErrorMessage(error)
      }))
    );
  }

  private validateInvoiceCanManageItems(invoice: Invoice | null): InvoiceItemsFacadeResult & { invoice?: Invoice } {
    if (!invoice) {
      return {
        success: false
      };
    }

    if (invoice.status === 2) {
      return {
        success: false,
        errorMessage: 'Nota fiscal fechada não pode ser alterada.'
      };
    }

    return {
      success: true,
      invoice
    };
  }

  private validateQuantity(rawQuantity: string | number): { success: boolean; quantity: number; errorMessage?: string } | { success: false; errorMessage: string } {
    const normalizedQuantity = this.normalizeQuantity(rawQuantity);

    if (normalizedQuantity === null) {
      return {
        success: false,
        errorMessage: 'Informe uma quantidade válida (número inteiro com mínimo de 1 unidade).'
      };
    }

    return {
      success: true,
      quantity: normalizedQuantity
    };
  }

  private normalizeQuantity(rawValue: string | number): number | null {
    const rawText = String(rawValue ?? '').trim();

    if (!rawText) {
      return null;
    }

    const parsedValue = Number(rawText);
    if (!Number.isInteger(parsedValue) || Number.isNaN(parsedValue) || parsedValue < 1) {
      return null;
    }

    return parsedValue;
  }

  private getFriendlyErrorMessage(error: HttpErrorResponse): string {
    return mapHttpErrorMessage(error, { domain: 'invoice-detail' });
  }
}