import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { DEFAULT_PAGE_SIZE_OPTIONS, PaginationControlsComponent } from '../../../core/components/pagination/pagination-controls.component';
import { BaseModalComponent } from '../../../core/components/modal/base-modal.component';
import { ConfirmationModalComponent } from '../../../core/components/modal/confirmation-modal.component';
import { mapHttpErrorMessage } from '../../../core/http/http-error-mapper';
import { ProblemDetails } from '../../../core/models/problem-details.model';
import { PaginatedListStore } from '../../../core/state/paginated-list.store';
import { InvoiceFormComponent } from '../components/invoice-form.component';
import { InvoicesTableComponent } from '../components/invoices-table.component';
import { InvoicesApiService } from '../data/invoices-api.service';
import { CreateInvoiceRequest } from '../models/create-invoice-request.model';
import { InvoiceListItem } from '../models/invoice-list-item.model';
import { getRelevantInvoiceDate } from '../utils/invoice-date.util';
import { toInvoiceStatusClass, toInvoiceStatusLabel } from '../utils/invoice-status.util';

@Component({
  selector: 'app-invoices-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PaginationControlsComponent, InvoiceFormComponent, BaseModalComponent, InvoicesTableComponent, ConfirmationModalComponent],
  templateUrl: './invoices-page.component.html',
  styleUrl: './invoices-page.component.scss',
})
export class InvoicesPageComponent implements OnInit, OnDestroy {
  private readonly invoicesApiService = inject(InvoicesApiService);
  private readonly router = inject(Router);
  private readonly paginatedInvoices = new PaginatedListStore<InvoiceListItem>({
    initialPageSize: DEFAULT_PAGE_SIZE_OPTIONS[0],
    loader: ({ page, pageSize }) => this.invoicesApiService.list({
      page,
      pageSize,
      status: this.selectedStatus() ? Number(this.selectedStatus()) as 1 | 2 : undefined
    }),
    mapError: (error) => this.getFriendlyErrorMessage(error),
  });

  readonly invoices = this.paginatedInvoices.items;
  readonly isLoading = this.paginatedInvoices.loading;
  readonly errorMessage = this.paginatedInvoices.error;
  readonly page = this.paginatedInvoices.page;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;
  readonly pageSize = this.paginatedInvoices.pageSize;
  readonly totalItems = this.paginatedInvoices.totalItems;
  readonly totalPages = this.paginatedInvoices.totalPages;
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
  readonly invoicePendingDeletion = signal<InvoiceListItem | null>(null);
  readonly isDeleteConfirmModalOpen = signal(false);

  ngOnInit(): void {
    this.loadInvoices();
  }

  ngOnDestroy(): void {
    this.paginatedInvoices.destroy();
  }

  loadInvoices(page = this.page()): void {
    this.successMessage.set(null);
    this.paginatedInvoices.load({ page });
  }

  onStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as '' | '1' | '2';
    this.selectedStatus.set(value);
    this.loadInvoices(1);
  }

  onPageSizeChange(nextPageSize: number): void {
    this.paginatedInvoices.setPageSize(nextPageSize);
  }

  previousPage(): void {
    this.paginatedInvoices.previousPage();
  }

  nextPage(): void {
    this.paginatedInvoices.nextPage();
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

  requestDeleteInvoice(invoice: InvoiceListItem): void {
    if (this.deletingInvoiceId()) {
      return;
    }

    this.invoicePendingDeletion.set(invoice);
    this.isDeleteConfirmModalOpen.set(true);
  }

  closeDeleteModal(): void {
    if (this.deletingInvoiceId()) {
      return;
    }

    this.isDeleteConfirmModalOpen.set(false);
    this.invoicePendingDeletion.set(null);
  }

  confirmDeleteInvoice(): void {
    const invoice = this.invoicePendingDeletion();

    if (!invoice || this.deletingInvoiceId()) {
      return;
    }

    this.paginatedInvoices.clearError();
    this.successMessage.set(null);
    this.deletingInvoiceId.set(invoice.id);

    this.invoicesApiService
      .delete(invoice.id)
      .pipe(
        finalize(() => {
          this.deletingInvoiceId.set(null);
          this.closeDeleteModal();
        })
      )
      .subscribe({
        next: () => {
          this.successMessage.set(`Nota NF-${invoice.number} excluída com sucesso.`);
          this.loadInvoices(this.page());
        },
        error: (error: HttpErrorResponse) => {
          this.paginatedInvoices.error.set(`Não foi possível excluir a nota fiscal. ${this.getFriendlyErrorMessage(error)}`);
        }
      });
  }

  getDeleteInvoiceLabel(): string {
    const invoiceNumber = this.invoicePendingDeletion()?.number;
    return invoiceNumber ? `NF-${invoiceNumber}?` : '';
  }

  closeInvoice(invoice: InvoiceListItem): void {
    if (invoice.status === 2) {
      return;
    }

    this.paginatedInvoices.clearError();
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
          this.paginatedInvoices.error.set(`Não foi possível fechar a nota fiscal. ${this.getFriendlyErrorMessage(error)}`);
        }
      });
  }

  isActionInProgress(invoiceId: string): boolean {
    return this.deletingInvoiceId() === invoiceId || this.closingInvoiceId() === invoiceId;
  }

  printInvoice(invoice: InvoiceListItem): void {
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