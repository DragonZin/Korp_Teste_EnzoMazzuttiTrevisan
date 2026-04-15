import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PagedResponse } from '../../../core/models/paged-response.model';
import { PaginationControlsComponent } from '../../../core/components/pagination/pagination-controls.component';
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

        <div
          *ngIf="isLoading()"
          class="d-flex align-items-center gap-2 mb-3 text-body-secondary"
          aria-live="polite"
        >
          <div class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></div>
          <span>Carregando notas fiscais...</span>
        </div>

        <ul class="list-group list-group-flush">
          <li *ngFor="let invoice of invoices()" class="list-group-item d-flex justify-content-between align-items-center px-0">
            <div class="me-2">
              <strong>NF-{{ invoice.number }}</strong>
              <p class="mb-0 text-body-secondary">
                <span class="badge" [class.bg-success]="invoice.status === 1" [class.bg-secondary]="invoice.status === 2">
                  {{ getStatusLabel(invoice.status) }}
                </span> •
                {{ invoice.customerName }} •
                {{ getInvoiceDate(invoice) }}
              </p>
            </div>
            <div class="d-flex align-items-center gap-2">
              <a class="btn btn-outline-primary btn-sm" [routerLink]="['/invoices', invoice.id]">Detalhar</a>
              <button
                type="button"
                class="btn btn-outline-danger btn-sm"
                (click)="deleteInvoice(invoice)"
                [disabled]="isLoading() || deletingInvoiceId() === invoice.id"
              >
                {{ deletingInvoiceId() === invoice.id ? 'Excluindo...' : 'Excluir' }}
              </button>
            </div>
          </li>

          <li *ngIf="!isLoading() && invoices().length === 0" class="list-group-item px-0 py-4 text-center">
            <p class="mb-1 fw-semibold">Nenhuma nota encontrada</p>
            <p class="mb-0 text-body-secondary">Ajuste os filtros ou recarregue a lista.</p>
          </li>
        </ul>

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
  `
})
export class InvoicesPageComponent implements OnInit {
  private readonly invoicesApiService = inject(InvoicesApiService);

  readonly invoices = signal<Invoice[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly totalPages = signal(0);
  readonly selectedStatus = signal<'1' | '2' | ''>('');
  readonly deletingInvoiceId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices(page = this.page()): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

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
    this.deletingInvoiceId.set(invoice.id);

    this.invoicesApiService
      .delete(invoice.id)
      .pipe(finalize(() => this.deletingInvoiceId.set(null)))
      .subscribe({
        next: () => {
          this.loadInvoices(this.page());
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(`Não foi possível excluir a nota fiscal. ${this.getFriendlyErrorMessage(error)}`);
        }
      });
  }

  getStatusLabel(status: number): 'Open' | 'Closed' {
    return status === 2 ? 'Closed' : 'Open';
  }

  getInvoiceDate(invoice: Invoice): string {
    const dateToFormat = invoice.status === 2 && invoice.closedAt ? invoice.closedAt : invoice.createdAt;
    return new Date(dateToFormat).toLocaleString();
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