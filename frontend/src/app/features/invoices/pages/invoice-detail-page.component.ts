import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { InvoicesApiService } from '../data/invoices-api.service';
import { Invoice } from '../models/invoice.model';
import { ProductsApiService } from '../../products/data/products-api.service';

@Component({
  selector: 'app-invoice-detail-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card border-0 shadow-sm">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start gap-3 mb-4 no-print">
          <div>
            <h2 class="h5 mb-1">Detalhe da nota NF-{{ invoice()?.number }}</h2>
            <p class="text-body-secondary mb-0">Visualização e edição da nota fiscal.</p>
          </div>
          <div class="d-flex gap-2">
            <button
              type="button"
              class="btn btn-outline-success btn-sm"
              (click)="closeInvoice()"
              [disabled]="!invoice() || invoice()!.status === 2 || isClosingInvoice()"
            >
              {{ isClosingInvoice() ? 'Fechando...' : 'Fechar nota' }}
            </button>
            <button type="button" class="btn btn-outline-primary btn-sm" (click)="printDetails()">Imprimir</button>
            <button type="button" class="btn btn-outline-secondary btn-sm" (click)="goBack()">Voltar para notas</button>
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
          <span>Carregando nota fiscal...</span>
        </div>

        <ng-container *ngIf="invoice() as invoice">
          <div class="invoice-print-area">
            <div class="row g-3 mb-4">
              <div class="col-md-4">
                <label class="form-label">Cliente</label>
                <div class="d-flex align-items-start gap-2 editable-field-wrap">
                  <input
                    type="text"
                    class="form-control"
                    [readonly]="!isEditingCustomerName()"
                    [value]="isEditingCustomerName() ? editedCustomerName() : invoice.customerName"
                    maxlength="255"
                    (input)="editedCustomerName.set(($any($event.target)).value)"
                  />
                  <button
                    type="button"
                    class="btn btn-outline-primary no-print"
                    (click)="isEditingCustomerName() ? saveCustomerName() : startEditingCustomerName()"
                    [disabled]="isUpdatingCustomerName() || invoice.status === 2"
                  >
                    {{ isUpdatingCustomerName() ? 'Salvando...' : (isEditingCustomerName() ? 'Salvar' : 'Editar') }}
                  </button>
                </div>
                <div class="mt-2 no-print" *ngIf="isEditingCustomerName()">
                  <button type="button" class="btn btn-outline-secondary btn-sm" (click)="cancelEditingCustomerName()">
                    Cancelar
                  </button>
                </div>
              </div>

              <div class="col-md-4">
                <label class="form-label">Documento</label>
                <div class="d-flex align-items-start gap-2 editable-field-wrap">
                  <input
                    type="text"
                    class="form-control"
                    [readonly]="!isEditingCustomerDocument()"
                    [value]="isEditingCustomerDocument() ? editedCustomerDocument() : invoice.customerDocument"
                    maxlength="18"
                    (input)="editedCustomerDocument.set(($any($event.target)).value)"
                  />
                  <button
                    type="button"
                    class="btn btn-outline-primary no-print"
                    (click)="isEditingCustomerDocument() ? saveCustomerDocument() : startEditingCustomerDocument()"
                    [disabled]="isUpdatingCustomerDocument() || invoice.status === 2"
                  >
                    {{ isUpdatingCustomerDocument() ? 'Salvando...' : (isEditingCustomerDocument() ? 'Salvar' : 'Editar') }}
                  </button>
                </div>
                <div class="mt-2 no-print" *ngIf="isEditingCustomerDocument()">
                  <button type="button" class="btn btn-outline-secondary btn-sm" (click)="cancelEditingCustomerDocument()">
                    Cancelar
                  </button>
                </div>
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

        <p *ngIf="!isLoading() && !invoice() && !errorMessage()" class="text-body-secondary mb-0">
          Nenhuma nota fiscal encontrada para o identificador informado.
        </p>

      </div>
    </section>
  `,
  styleUrl: './invoice-detail-page.component.scss',
})
export class InvoiceDetailPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly invoicesApiService = inject(InvoicesApiService);
  private readonly productsApiService = inject(ProductsApiService);

  protected readonly invoiceId = signal('');
  protected readonly invoice = signal<Invoice | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly productNamesById = signal<Record<string, string>>({});
  protected readonly isEditingCustomerName = signal(false);
  protected readonly editedCustomerName = signal('');
  protected readonly isUpdatingCustomerName = signal(false);
  protected readonly isEditingCustomerDocument = signal(false);
  protected readonly editedCustomerDocument = signal('');
  protected readonly isUpdatingCustomerDocument = signal(false);
  protected readonly isClosingInvoice = signal(false);
  private shouldAutoPrint = false;
  private readonly customerDocumentPattern = /^(\d{11}|\d{14}|\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})$/;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.shouldAutoPrint = this.route.snapshot.queryParamMap.get('autoPrint') === '1';
    this.invoiceId.set(id);

    if (!id) {
      this.errorMessage.set('Identificador da nota fiscal não foi informado.');
      return;
    }

    this.loadInvoice(id);
  }

  ngOnDestroy(): void {
    this.disablePrintMode();
  }

  protected goBack(): void {
    void this.router.navigate(['/invoices']);
  }

  protected printDetails(): void {
    if (!this.invoice()) {
      return;
    }

    this.enablePrintMode();
    window.addEventListener('afterprint', () => this.disablePrintMode(), { once: true });
    window.print();
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

  protected startEditingCustomerName(): void {
    const invoice = this.invoice();

    if (!invoice) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.editedCustomerName.set(invoice.customerName);
    this.isEditingCustomerName.set(true);
  }

  protected cancelEditingCustomerName(): void {
    const invoice = this.invoice();
    this.editedCustomerName.set(invoice?.customerName ?? '');
    this.isEditingCustomerName.set(false);
  }

  protected saveCustomerName(): void {
    const invoice = this.invoice();

    if (!invoice) {
      return;
    }

    const customerName = this.editedCustomerName().trim();

    if (!customerName) {
      this.errorMessage.set('Nome do cliente é obrigatório.');
      return;
    }

    if (customerName.length > 255) {
      this.errorMessage.set('Nome do cliente deve ter no máximo 255 caracteres.');
      return;
    }

    this.isUpdatingCustomerName.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.invoicesApiService
      .update(invoice.id, { customerName })
      .pipe(finalize(() => this.isUpdatingCustomerName.set(false)))
      .subscribe({
        next: (updatedInvoice) => {
          this.invoice.set(updatedInvoice);
          this.editedCustomerName.set(updatedInvoice.customerName);
          this.isEditingCustomerName.set(false);
          this.successMessage.set('Nome do cliente atualizado com sucesso.');
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.getFriendlyErrorMessage(error));
        }
      });
  }

  protected startEditingCustomerDocument(): void {
    const invoice = this.invoice();

    if (!invoice) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.editedCustomerDocument.set(invoice.customerDocument);
    this.isEditingCustomerDocument.set(true);
  }

  protected cancelEditingCustomerDocument(): void {
    const invoice = this.invoice();
    this.editedCustomerDocument.set(invoice?.customerDocument ?? '');
    this.isEditingCustomerDocument.set(false);
  }

  protected saveCustomerDocument(): void {
    const invoice = this.invoice();

    if (!invoice) {
      return;
    }

    const customerDocument = this.editedCustomerDocument().trim();

    if (!customerDocument) {
      this.errorMessage.set('Documento do cliente é obrigatório.');
      return;
    }

    if (customerDocument.length < 11 || customerDocument.length > 18 || !this.customerDocumentPattern.test(customerDocument)) {
      this.errorMessage.set('Documento deve estar no formato CPF ou CNPJ válido.');
      return;
    }

    this.isUpdatingCustomerDocument.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.invoicesApiService
      .update(invoice.id, { customerDocument })
      .pipe(finalize(() => this.isUpdatingCustomerDocument.set(false)))
      .subscribe({
        next: (updatedInvoice) => {
          this.invoice.set(updatedInvoice);
          this.editedCustomerDocument.set(updatedInvoice.customerDocument);
          this.isEditingCustomerDocument.set(false);
          this.successMessage.set('Documento do cliente atualizado com sucesso.');
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.getFriendlyErrorMessage(error));
        }
      });
  }

  protected getStatusLabel(status: number): 'Open' | 'Closed' {
    return status === 2 ? 'Closed' : 'Open';
  }

  protected getProductDisplayName(productId: string): string {
    return this.productNamesById()[productId] ?? productId;
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
          this.editedCustomerName.set(invoice.customerName);
          this.editedCustomerDocument.set(invoice.customerDocument);
          this.loadProductNames(invoice);

          if (this.shouldAutoPrint) {
            this.shouldAutoPrint = false;
            setTimeout(() => this.printDetails(), 150);
          }
        },
        error: (error: HttpErrorResponse) => {
          this.invoice.set(null);
          this.productNamesById.set({});
          this.successMessage.set(null);
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