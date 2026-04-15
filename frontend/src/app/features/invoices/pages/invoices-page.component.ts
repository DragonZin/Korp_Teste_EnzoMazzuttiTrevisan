import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { mapHttpErrorMessage } from '../../../core/http/http-error-mapper';
import { ProblemDetails } from '../../../core/models/problem-details.model';
import { PagedResponse } from '../../../core/models/paged-response.model';
import { DEFAULT_PAGE_SIZE_OPTIONS, PaginationControlsComponent} from '../../../core/components/pagination/pagination-controls.component';
import { BaseModalComponent } from '../../../core/components/modal/base-modal.component';
import { InvoiceFormComponent } from '../components/invoice-form.component';
import { InvoicesApiService } from '../data/invoices-api.service';
import { CreateInvoiceRequest } from '../models/create-invoice-request.model';
import { Invoice } from '../models/invoice.model';
import { getRelevantInvoiceDate } from '../utils/invoice-date.util';
import { toInvoiceStatusClass, toInvoiceStatusLabel } from '../utils/invoice-status.util';

@Component({
  selector: 'app-invoices-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PaginationControlsComponent, InvoiceFormComponent, BaseModalComponent],
  templateUrl: './invoices-page.component.html',
  styleUrl: './invoices-page.component.scss',
})
export class InvoicesPageComponent implements OnInit {
  private readonly invoicesApiService = inject(InvoicesApiService);
  private readonly router = inject(Router);

  readonly invoices = signal<Invoice[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly page = signal(1);
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;
  readonly pageSize = signal(this.pageSizeOptions[0]);
  readonly totalItems = signal(0);
  readonly totalPages = signal(0);
  readonly selectedStatus = signal<'1' | '2' | ''>('');
  readonly deletingInvoiceId = signal<string | null>(null);
  readonly closingInvoiceId = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly isCreateModalOpen = signal(false);
  readonly isCreatingInvoice = signal(false);
  readonly createApiError = signal<string | null>(null);
  readonly createFieldErrors = signal<Partial<Record<keyof CreateInvoiceRequest, string>>>({});
  readonly createCustomerName = signal('');
  readonly createCustomerDocument = signal('');

  protected readonly toInvoiceStatusLabel = toInvoiceStatusLabel;
  protected readonly toInvoiceStatusClass = toInvoiceStatusClass;
  protected readonly getRelevantInvoiceDate = getRelevantInvoiceDate;
  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices(page = this.page()): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    
    this.invoicesApiService
      .list({
        page,
        pageSize: this.pageSize(),
        status: this.selectedStatus() ? Number(this.selectedStatus()) as 1 | 2 : undefined
      })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response: PagedResponse<Invoice>) => {
          this.invoices.set(response.items);
          this.page.set(response.page);
          this.pageSize.set(response.pageSize);
          this.totalItems.set(response.totalItems);
          this.totalPages.set(response.totalPages);
        },
        error: (error: HttpErrorResponse) => {
          this.invoices.set([]);
          this.totalItems.set(0);
          this.totalPages.set(0);
          this.errorMessage.set(this.getFriendlyErrorMessage(error));
        }
      });
  }

  onStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as '' | '1' | '2';
    this.selectedStatus.set(value);
    this.loadInvoices(1);
  }

  onPageSizeChange(nextPageSize: number): void {
    this.pageSize.set(nextPageSize);
    this.loadInvoices(1);
  }

  previousPage(): void {
    if (this.page() <= 1) {
      return;
    }

    this.loadInvoices(this.page() - 1);
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) {
      return;
    }

    this.loadInvoices(this.page() + 1);
  }

  openCreateModal(): void {
    this.clearCreateErrors();
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    if (this.isCreatingInvoice()) {
      return;
    }
    
    this.isCreateModalOpen.set(false);
    this.clearCreateErrors();
    this.createFieldErrors.set({});
  }

  submitCreateInvoice(payload: CreateInvoiceRequest): void {
    if (this.isCreatingInvoice()) {
      return;
    }

    this.clearCreateErrors();

    this.isCreatingInvoice.set(true);

    this.invoicesApiService
      .create(payload)
      .pipe(finalize(() => this.isCreatingInvoice.set(false)))
      .subscribe({
        next: () => {
          this.isCreateModalOpen.set(false);
          this.clearCreateErrors();
          this.successMessage.set('Nota fiscal criada com sucesso.');
          this.loadInvoices(1);
        },
        error: (error: HttpErrorResponse) => {
          const problemDetails = error.error as Partial<ProblemDetails> | null;
          const mappedFieldErrors = this.mapCreateFieldErrors(problemDetails);

          this.createFieldErrors.set(mappedFieldErrors);
          this.createApiError.set(
            Object.keys(mappedFieldErrors).length > 0
              ? 'Existem campos inválidos. Revise os dados e tente novamente.'
              : this.getFriendlyCreateErrorMessage(error)
            );
        }
      });
  }

  deleteInvoice(invoice: Invoice): void {
    const shouldDelete = window.confirm(`Deseja realmente excluir a nota NF-${invoice.number}?`);
    if (!shouldDelete) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.deletingInvoiceId.set(invoice.id);

    this.invoicesApiService
      .delete(invoice.id)
      .pipe(finalize(() => this.deletingInvoiceId.set(null)))
      .subscribe({
        next: () => {
          this.successMessage.set(`Nota NF-${invoice.number} excluída com sucesso.`);
          this.loadInvoices(this.page());
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(`Não foi possível excluir a nota fiscal. ${this.getFriendlyErrorMessage(error)}`);
        }
      });
  }

  closeInvoice(invoice: Invoice): void {
    if (invoice.status === 2) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.closingInvoiceId.set(invoice.id);

    this.invoicesApiService
      .close(invoice.id)
      .pipe(finalize(() => this.closingInvoiceId.set(null)))
      .subscribe({
        next: () => {
          this.successMessage.set(`Nota NF-${invoice.number} fechada com sucesso.`);
          this.loadInvoices(this.page());
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(`Não foi possível fechar a nota fiscal. ${this.getFriendlyErrorMessage(error)}`);
        }
      });
  }

  isActionInProgress(invoiceId: string): boolean {
    return this.deletingInvoiceId() === invoiceId || this.closingInvoiceId() === invoiceId;
  }

  printInvoice(invoice: Invoice): void {
    void this.router.navigate(['/invoices', invoice.id, 'print']);
  }
  
  private getFriendlyErrorMessage(error: HttpErrorResponse): string {
    return mapHttpErrorMessage(error, { domain: 'invoices' });
  }

  private getFriendlyCreateErrorMessage(error: HttpErrorResponse): string {
    return mapHttpErrorMessage(error, { domain: 'invoices', operation: 'create' });
  }

  private clearCreateErrors(): void {
    this.createApiError.set(null);
    this.createFieldErrors.set({});
  }

  private mapCreateFieldErrors(
    problemDetails: Partial<ProblemDetails> | null
  ): Partial<Record<keyof CreateInvoiceRequest, string>> {
    const fieldErrors: Partial<Record<keyof CreateInvoiceRequest, string>> = {};
    const errors = problemDetails?.errors;

    if (errors && typeof errors === 'object') {
      for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
        const normalized = key.toLowerCase();

        if (normalized === 'customername') {
          fieldErrors.customerName = Array.isArray(value) ? String(value[0]) : String(value);
        }

        if (normalized === 'customerdocument') {
          fieldErrors.customerDocument = Array.isArray(value) ? String(value[0]) : String(value);
        }
      }
    }

    return fieldErrors;
  }
}