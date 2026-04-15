import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PagedResponse } from '../../../core/models/paged-response.model';
import { DEFAULT_PAGE_SIZE_OPTIONS, PaginationControlsComponent} from '../../../core/components/pagination/pagination-controls.component';
import { InvoicesApiService } from '../data/invoices-api.service';
import { Invoice } from '../models/invoice.model';

@Component({
  selector: 'app-invoices-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PaginationControlsComponent],
  template: `
    <section class="card border-0 shadow-sm">
      <div class="card-body">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h2 class="h5 mb-1">Notas fiscais</h2>
            <p class="text-body-secondary mb-0">Listagem de notas.</p>
          </div>
          <button type="button" class="btn btn-outline-secondary" (click)="loadInvoices(page())" [disabled]="isLoading()">
            Recarregar
          </button>
        </div>

        <div class="d-flex align-items-end gap-2 mb-3">
          <div>
            <label class="form-label mb-1" for="invoice-status">Status</label>
            <select
              id="invoice-status"
              class="form-select"
              [value]="selectedStatus()"
              (change)="onStatusChange($event)"
              [disabled]="isLoading()"
            >
              <option value="">Todos</option>
              <option value="1">Open</option>
              <option value="2">Closed</option>
            </select>
          </div>
        </div>

        <div *ngIf="errorMessage() as error" class="alert alert-danger" role="alert">
          {{ error }}
        </div>
        <div *ngIf="successMessage() as success" class="alert alert-success" role="status">
          {{ success }}
        </div>

        <div
          *ngIf="isLoading()"
          class="d-flex align-items-center gap-2 mb-3 text-body-secondary"
          aria-live="polite"
        >
          <div class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></div>
          <span>Carregando notas fiscais...</span>
        </div>

        <div class="card border-0 bg-body-tertiary">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0 invoice-table">
              <thead class="table-light">
                <tr>
                  <th scope="col">Número</th>
                  <th scope="col">Cliente</th>
                  <th scope="col">Status</th>
                  <th scope="col">Data</th>
                  <th scope="col" class="text-end">Total</th>
                  <th scope="col" class="text-end">Ações</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let invoice of invoices()">
                  <td data-label="Número">
                    <span class="fw-semibold">NF-{{ invoice.number }}</span>
                  </td>
                  <td data-label="Cliente">{{ invoice.customerName }}</td>
                  <td data-label="Status">
                    <span class="badge rounded-pill invoice-status-badge" [ngClass]="getStatusBadgeClass(invoice.status)">
                      {{ getStatusLabel(invoice.status) }}
                    </span>
                  </td>
                  <td data-label="Data">{{ getInvoiceDate(invoice) | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td data-label="Total" class="text-end fw-semibold">{{ invoice.totalAmount | currency: 'BRL':'symbol':'1.2-2' }}</td>
                  <td data-label="Ações">
                    <div class="d-flex justify-content-end flex-wrap gap-2">
                      <a
                        class="btn btn-outline-primary btn-sm"
                        [routerLink]="['/invoices', invoice.id]"
                        [class.disabled]="isActionInProgress(invoice.id)"
                        [attr.aria-disabled]="isActionInProgress(invoice.id)"
                      >
                        Editar
                      </a>
                      <button
                        type="button"
                        class="btn btn-outline-danger btn-sm"
                        (click)="deleteInvoice(invoice)"
                        (click)="printInvoice(invoice)"
                        [disabled]="isActionInProgress(invoice.id)"
                      >
                        {{ deletingInvoiceId() === invoice.id ? 'Excluindo...' : 'Excluir' }}
                      </button>
                      <button
                        type="button"
                        class="btn btn-outline-success btn-sm"
                        (click)="closeInvoice(invoice)"
                        [disabled]="invoice.status === 2 || isActionInProgress(invoice.id)"
                      >
                        {{ closingInvoiceId() === invoice.id ? 'Fechando...' : 'Fechar nota' }}
                      </button>
                      <button
                        type="button"
                        class="btn btn-outline-secondary btn-sm"
                        [disabled]="isActionInProgress(invoice.id)"
                        aria-label="Imprimir nota fiscal"
                      >
                        Imprimir
                      </button>
                    </div>
                  </td>
                </tr>

                <tr *ngIf="!isLoading() && invoices().length === 0">
                  <td colspan="6" class="py-4 text-center">
                    <p class="mb-1 fw-semibold">Nenhuma nota encontrada</p>
                    <p class="mb-0 text-body-secondary">Ajuste os filtros ou recarregue a lista.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <app-pagination-controls
          [currentItemCount]="invoices().length"
          [totalItems]="totalItems()"
          [page]="page()"
          [totalPages]="totalPages()"
          [pageSize]="pageSize()"
          [pageSizeOptions]="pageSizeOptions"
          [isLoading]="isLoading()"
          pageSizeId="invoices-page-size"
          ariaLabel="Paginação das notas"
          (previous)="previousPage()"
          (next)="nextPage()"
          (pageSizeChange)="onPageSizeChange($event)"
        />
      </div>
    </section>
  `,
  styles: [`
    .invoice-status-badge {
      min-width: 5.5rem;
      font-weight: 600;
    }

    .invoice-status-open {
      background-color: var(--bs-success-bg-subtle);
      color: var(--bs-success-text-emphasis);
    }

    .invoice-status-closed {
      background-color: var(--bs-secondary-bg-subtle);
      color: var(--bs-secondary-text-emphasis);
    }

    @media (max-width: 767.98px) {
      .invoice-table thead {
        display: none;
      }

      .invoice-table,
      .invoice-table tbody,
      .invoice-table tr,
      .invoice-table td {
        display: block;
        width: 100%;
      }

      .invoice-table tr {
        padding: 0.75rem;
        border-bottom: 1px solid var(--bs-border-color);
      }

      .invoice-table td {
        border: 0;
        padding: 0.35rem 0;
        text-align: left !important;
      }

      .invoice-table td::before {
        content: attr(data-label);
        display: block;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--bs-secondary-color);
        margin-bottom: 0.15rem;
      }
    }
  `]
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

  getStatusBadgeClass(status: number): 'invoice-status-open' | 'invoice-status-closed' {
    return status === 2 ? 'invoice-status-closed' : 'invoice-status-open';
  }

  getStatusLabel(status: number): 'Open' | 'Closed' {
    return status === 2 ? 'Closed' : 'Open';
  }

  getInvoiceDate(invoice: Invoice): Date {
    const dateToFormat = invoice.status === 2 && invoice.closedAt ? invoice.closedAt : invoice.createdAt;
    return new Date(dateToFormat);
  }
  
  printInvoice(invoice: Invoice): void {
    void this.router.navigate(['/invoices', invoice.id], {
      queryParams: { autoPrint: '1' }
    });
  }

  private getFriendlyErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'Não foi possível conectar com a API de notas fiscais. Verifique se os serviços estão em execução.';
    }

    if (typeof error.error?.detail === 'string' && error.error.detail.trim().length > 0) {
      return error.error.detail;
    }

    return 'Não foi possível carregar as notas fiscais no momento. Tente novamente em instantes.';
  }
}