import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ProductsApiService } from '../../products/data/products-api.service';
import { InvoicesApiService } from '../data/invoices-api.service';
import { Invoice } from '../models/invoice.model';

@Component({
  selector: 'app-invoice-print-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card border-0 shadow-sm">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start gap-3 mb-4 no-print">
          <div>
            <h2 class="h5 mb-1">Impressão da nota NF-{{ invoice()?.number }}</h2>
            <p class="text-body-secondary mb-0">Revise os dados e use as ações abaixo.</p>
          </div>
          <div class="d-flex gap-2 flex-wrap justify-content-end">
            <button
              type="button"
              class="btn btn-outline-success btn-sm"
              (click)="closeInvoice()"
              [disabled]="!invoice() || invoice()!.status === 2 || isClosingInvoice()"
            >
              {{ isClosingInvoice() ? 'Fechando...' : 'Fechar nota' }}
            </button>
            <button
              type="button"
              class="btn btn-outline-primary btn-sm"
              (click)="printAgain()"
              [disabled]="!invoice()"
            >
              Imprimir
            </button>
            <button type="button" class="btn btn-outline-secondary btn-sm" (click)="goBack()">
              Voltar para notas
            </button>
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
          <span>Carregando nota fiscal para impressão...</span>
        </div>

        <ng-container *ngIf="invoice() as invoice">
          <div class="invoice-print-area">
            <div class="row g-3 mb-4">
              <div class="col-md-4">
                <label class="form-label">Cliente</label>
                <p class="form-control-plaintext border rounded px-3 py-2 mb-0">{{ invoice.customerName }}</p>
              </div>
              <div class="col-md-4">
                <label class="form-label">Documento</label>
                <p class="form-control-plaintext border rounded px-3 py-2 mb-0">{{ invoice.customerDocument }}</p>
              </div>
              <div class="col-md-4">
                <label class="form-label">Status</label>
                <p class="form-control-plaintext border rounded px-3 py-2 mb-0">{{ getStatusLabel(invoice.status) }}</p>
              </div>
              <div class="col-md-3">
                <label class="form-label">Emissão</label>
                <p class="form-control-plaintext border rounded px-3 py-2 mb-0">{{ invoice.createdAt | date: 'short' }}</p>
              </div>
              <div class="col-md-3">
                <label class="form-label">Fechamento</label>
                <p class="form-control-plaintext border rounded px-3 py-2 mb-0">
                  {{ invoice.closedAt ? (invoice.closedAt | date: 'short') : '-' }}
                </p>
              </div>
              <div class="col-md-3">
                <label class="form-label">Total</label>
                <p class="form-control-plaintext border rounded px-3 py-2 mb-0">{{ invoice.totalAmount | currency: 'BRL' }}</p>
              </div>
              <div class="col-md-3">
                <label class="form-label">Número</label>
                <p class="form-control-plaintext border rounded px-3 py-2 mb-0">NF-{{ invoice.number }}</p>
              </div>
            </div>

            <h3 class="h6 mb-3">Produtos da nota</h3>

            <div class="table-responsive">
              <table class="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th class="text-end">Preço unitário</th>
                    <th class="text-end">Quantidade</th>
                    <th class="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let product of invoice.products">
                    <td>{{ getProductDisplayName(product.productId) }}</td>
                    <td class="text-end">{{ product.unitPrice | currency: 'BRL' }}</td>
                    <td class="text-end">{{ product.quantity }}</td>
                    <td class="text-end">{{ product.totalPrice | currency: 'BRL' }}</td>
                  </tr>

                  <tr *ngIf="invoice.products.length === 0">
                    <td colspan="4" class="text-center text-body-secondary py-3">
                      Esta nota não possui produtos cadastrados.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </ng-container>
      </div>
    </section>
  `,
  styleUrl: './invoice-print-page.component.scss',
})
export class InvoicePrintPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly invoicesApiService = inject(InvoicesApiService);
  private readonly productsApiService = inject(ProductsApiService);

  protected readonly invoice = signal<Invoice | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly isClosingInvoice = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly productNamesById = signal<Record<string, string>>({});

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';

    if (!id) {
      this.errorMessage.set('Identificador da nota fiscal não foi informado.');
      return;
    }

    this.loadInvoice(id);
  }

  ngOnDestroy(): void {
    this.disablePrintMode();
  }

  protected getStatusLabel(status: number): 'Open' | 'Closed' {
    return status === 2 ? 'Closed' : 'Open';
  }

  protected getProductDisplayName(productId: string): string {
    return this.productNamesById()[productId] ?? productId;
  }

  protected goBack(): void {
    void this.router.navigate(['/invoices']);
  }

  protected printAgain(): void {
    this.printDetails();
  }

  protected closeInvoice(): void {
    const invoice = this.invoice();

    if (!invoice || invoice.status === 2) {
      return;
    }

    this.isClosingInvoice.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.invoicesApiService
      .close(invoice.id)
      .pipe(finalize(() => this.isClosingInvoice.set(false)))
      .subscribe({
        next: (updatedInvoice) => {
          this.invoice.set(updatedInvoice);
          this.successMessage.set(`Nota fiscal NF-${updatedInvoice.number} foi fechada com sucesso.`);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.getFriendlyErrorMessage(error));
        }
      });
  }

  private loadInvoice(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.invoicesApiService
      .getById(id)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (invoice: Invoice) => {
          this.invoice.set(invoice);
          this.loadProductNames(invoice);
          this.printDetails();
        },
        error: (error: HttpErrorResponse) => {
          this.invoice.set(null);
          this.productNamesById.set({});
          this.errorMessage.set(this.getFriendlyErrorMessage(error));
        }
      });
  }

  private loadProductNames(invoice: Invoice): void {
    const uniqueProductIds = [...new Set(invoice.products.map((item) => item.productId).filter(Boolean))];

    if (uniqueProductIds.length === 0) {
      this.productNamesById.set({});
      return;
    }

    this.productsApiService.getByIds(uniqueProductIds).subscribe({
      next: (products) => {
        const namesLookup = uniqueProductIds.reduce<Record<string, string>>((accumulator, productId) => {
          accumulator[productId] = productId;
          return accumulator;
        }, {});

        products.forEach((product) => {
          namesLookup[product.id] = product.name;
        });

        this.productNamesById.set(namesLookup);
      },
      error: () => {
        const fallbackLookup = uniqueProductIds.reduce<Record<string, string>>((accumulator, productId) => {
          accumulator[productId] = productId;
          return accumulator;
        }, {});

        this.productNamesById.set(fallbackLookup);
      }
    });
  }

  private printDetails(): void {
    if (!this.invoice()) {
      return;
    }

    this.enablePrintMode();
    window.addEventListener('afterprint', () => this.disablePrintMode(), { once: true });
    setTimeout(() => window.print(), 150);
  }

  private getFriendlyErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'Não foi possível conectar com a API de notas fiscais. Verifique se os serviços estão em execução.';
    }

    if (error.status === 404) {
      return 'Nota fiscal não encontrada.';
    }

    if (typeof error.error?.detail === 'string' && error.error.detail.trim().length > 0) {
      return error.error.detail;
    }

    return 'Não foi possível carregar a nota fiscal no momento. Tente novamente em instantes.';
  }

  private enablePrintMode(): void {
    document.body.classList.add('invoice-print-mode');
  }

  private disablePrintMode(): void {
    document.body.classList.remove('invoice-print-mode');
  }
}