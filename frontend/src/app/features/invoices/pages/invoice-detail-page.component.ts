import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { InvoicesApiService } from '../data/invoices-api.service';
import { Invoice } from '../models/invoice.model';
import { ProductsApiService } from '../../products/data/products-api.service';
import { Product } from '../../products/models/product.model';
import { QuantityStepperComponent } from '../components/quantity-stepper.component';

@Component({
  selector: 'app-invoice-detail-page',
  standalone: true,
  imports: [CommonModule, QuantityStepperComponent],
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
              [disabled]="!invoice() || isInvoiceClosed() || isClosingInvoice()"
            >
              {{ isClosingInvoice() ? 'Fechando...' : 'Fechar nota' }}
            </button>
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
                    [disabled]="isUpdatingCustomerName() || isInvoiceClosed()"
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
                    <th>Código</th>
                    <th>Produto</th>
                    <th class="text-end">Preço unitário</th>
                    <th class="text-end">Quantidade</th>
                    <th class="text-end">Total</th>
                    <th class="text-end no-print" *ngIf="canManageItems(invoice)">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let product of invoice.products">
                    <td>{{ getProductCode(product.productId) }}</td>
                    <td>{{ getProductDisplayName(product.productId) }}</td>
                    <td class="text-end">{{ product.unitPrice | currency: 'BRL' }}</td>
                    <td class="text-end">
                      <div class="d-inline-flex align-items-center gap-2" *ngIf="canManageItems(invoice); else readOnlyQuantity">
                        <app-quantity-stepper
                          [value]="editableItemQuantities()[product.productId] ?? product.quantity"
                          [min]="1"
                          [disabled]="isItemActionDisabled(product.productId)"
                          inputAriaLabel="Quantidade do item {{ getProductDisplayName(product.productId) }}"
                          (commit)="commitItemQuantity(product.productId, $event)"
                        />
                      </div>
                      <ng-template #readOnlyQuantity>{{ product.quantity }}</ng-template>
                    </td>
                    <td class="text-end">{{ product.totalPrice | currency: 'BRL' }}</td>
                    <td class="text-end no-print" *ngIf="canManageItems(invoice)">
                      <button
                        type="button"
                        class="btn btn-outline-danger btn-sm"
                        (click)="removeProduct(product.productId)"
                        [disabled]="isItemActionDisabled(product.productId)"
                      >
                        {{ removingProductId() === product.productId ? 'Excluindo...' : 'Excluir' }}
                      </button>
                    </td>
                  </tr>

                  <tr *ngIf="invoice.products.length === 0">
                    <td [attr.colspan]="canManageItems(invoice) ? 6 : 5" class="text-center text-body-secondary py-3">
                      Esta nota não possui produtos cadastrados.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="card border-0 bg-body-tertiary p-3 mt-3 no-print" *ngIf="canManageItems(invoice)">
              <h4 class="h6 mb-3">Adicionar produto</h4>
              <div class="d-flex justify-content-end">
                <button
                  type="button"
                  class="btn btn-primary"
                  (click)="openAddProductModal()"
                  [disabled]="isAddingProduct()"
                >
                  Adicionar produto
                </button>
              </div>
            </div>
          </div>
        </ng-container>

        <p *ngIf="!isLoading() && !invoice() && !errorMessage()" class="text-body-secondary mb-0">
          Nenhuma nota fiscal encontrada para o identificador informado.
        </p>

      </div>
    </section>
    <div *ngIf="isAddProductModalOpen()" class="overlay no-print" (click)="closeAddProductModal()" aria-hidden="true">
      <div
        class="modal-container p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-add-product-modal-title"
        (click)="$event.stopPropagation()"
      >
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h3 id="invoice-add-product-modal-title" class="h5 mb-1">Adicionar produto</h3>
            <p class="text-body-secondary mb-0">Selecione um item do catálogo para incluir na nota fiscal.</p>
          </div>
          <button type="button" class="btn-close" aria-label="Fechar modal" (click)="closeAddProductModal()"></button>
        </div>

        <div *ngIf="isLoadingProductsCatalog()" class="small text-body-secondary mb-2">Carregando catálogo...</div>

        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nome</th>
                <th class="text-end">Estoque</th>
                <th class="text-end">Qtd. disponível</th>
                <th class="text-end">Preço</th>
                <th class="text-end">Ação</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let product of productsCatalog()">
                <td>{{ product.code }}</td>
                <td>{{ product.name }}</td>
                <td class="text-end">{{ product.stock }}</td>
                <td class="text-end">{{ product.availableQuantity }}</td>
                <td class="text-end">{{ product.price | currency: 'BRL' : 'symbol' : '1.2-2' : 'pt-BR' }}</td>
                <td class="text-end">
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-primary"
                    (click)="selectProductToAdd(product)"
                    [disabled]="isAddingProduct()"
                  >
                    Selecionar
                  </button>
                </td>
              </tr>
              <tr *ngIf="!isLoadingProductsCatalog() && productsCatalog().length === 0">
                <td colspan="6" class="text-center text-body-secondary py-4">Nenhum produto disponível no catálogo.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
          <div class="small text-body-secondary">
            Página {{ catalogPage() }} de {{ catalogTotalPages() || 1 }} · {{ catalogTotalItems() }} itens
          </div>
          <div class="d-flex align-items-center gap-2">
            <label class="small text-body-secondary" for="catalog-page-size">Itens por página</label>
            <select
              id="catalog-page-size"
              class="form-select form-select-sm page-size-select"
              [value]="catalogPageSize()"
              [disabled]="isLoadingProductsCatalog()"
              (change)="onCatalogPageSizeChange(($any($event.target)).value)"
            >
              <option [value]="10">10</option>
              <option [value]="25">25</option>
              <option [value]="50">50</option>
            </select>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              (click)="goToPreviousCatalogPage()"
              [disabled]="!canGoToPreviousCatalogPage()"
            >
              Anterior
            </button>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              (click)="goToNextCatalogPage()"
              [disabled]="!canGoToNextCatalogPage()"
            >
              Próxima
            </button>
          </div>
        </div>

        <div *ngIf="selectedProductIdToAdd()" class="modal-confirmation border-top mt-3 pt-3">
          <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <p class="mb-1 fw-semibold">Produto selecionado: {{ getSelectedCatalogProductLabel() }}</p>
              <p class="text-body-secondary mb-0 small">Defina a quantidade e confirme a adição.</p>
            </div>
            <div class="d-flex align-items-center gap-3">
              <app-quantity-stepper
                [value]="quantityToAdd()"
                [min]="1"
                [disabled]="isAddingProduct()"
                inputAriaLabel="Quantidade do produto para adicionar"
                (commit)="commitAddQuantity($event)"
              />
              <button type="button" class="btn btn-primary" (click)="addSelectedProduct()" [disabled]="isAddingProduct()">
                {{ isAddingProduct() ? 'Adicionando...' : 'Confirmar adição' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './invoice-detail-page.component.scss',
})
export class InvoiceDetailPageComponent implements OnInit {
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
  protected readonly productCodesById = signal<Record<string, string>>({});
  protected readonly isEditingCustomerName = signal(false);
  protected readonly editedCustomerName = signal('');
  protected readonly isUpdatingCustomerName = signal(false);
  protected readonly isEditingCustomerDocument = signal(false);
  protected readonly editedCustomerDocument = signal('');
  protected readonly isUpdatingCustomerDocument = signal(false);
  protected readonly isClosingInvoice = signal(false);
  protected readonly productsCatalog = signal<Product[]>([]);
  protected readonly isLoadingProductsCatalog = signal(false);
  protected readonly selectedProductIdToAdd = signal('');
  protected readonly isAddProductModalOpen = signal(false);
  protected readonly catalogPage = signal(1);
  protected readonly catalogPageSize = signal(10);
  protected readonly catalogTotalItems = signal(0);
  protected readonly catalogTotalPages = signal(0);
  protected readonly catalogSearchTerm = signal('');
  protected readonly quantityToAdd = signal(1);
  protected readonly editableItemQuantities = signal<Partial<Record<string, number>>>({});
  protected readonly isAddingProduct = signal(false);
  protected readonly updatingProductId = signal<string | null>(null);
  protected readonly removingProductId = signal<string | null>(null);
  protected readonly isInvoiceClosed = computed(() => this.invoice()?.status === 2);
  private readonly customerDocumentPattern = /^(\d{11}|\d{14}|\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})$/;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.invoiceId.set(id);

    if (!id) {
      this.errorMessage.set('Identificador da nota fiscal não foi informado.');
      return;
    }

    this.loadInvoice(id);
  }

  protected goBack(): void {
    void this.router.navigate(['/invoices']);
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

  protected getProductCode(productId: string): string {
    return this.productCodesById()[productId] ?? '-';
  }

  protected canManageItems(invoice: Invoice): boolean {
    return invoice.status !== 2;
  }

  protected isItemActionDisabled(productId: string): boolean {
    return this.updatingProductId() === productId || this.removingProductId() === productId || this.isAddingProduct();
  }

  protected commitAddQuantity(rawValue: string | number): void {
    const normalizedQuantity = this.normalizeQuantity(rawValue);
    if (normalizedQuantity === null) {
      this.errorMessage.set('Informe uma quantidade válida (número inteiro com mínimo de 1 unidade).');
      this.quantityToAdd.set(1);
      return;
    }

    this.errorMessage.set(null);
    this.quantityToAdd.set(normalizedQuantity);
  }

  protected openAddProductModal(): void {
    if (this.isAddingProduct()) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.selectedProductIdToAdd.set('');
    this.quantityToAdd.set(1);
    this.isAddProductModalOpen.set(true);
    this.loadProductsCatalog();
  }

  protected closeAddProductModal(): void {
    if (this.isAddingProduct()) {
      return;
    }

    this.clearAddProductSelection();
    this.isAddProductModalOpen.set(false);
  }

  protected selectProductToAdd(product: Product): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.selectedProductIdToAdd.set(product.id);
    this.quantityToAdd.set(1);
  }

  protected getSelectedCatalogProductLabel(): string {
    const selectedProduct = this.productsCatalog().find((product) => product.id === this.selectedProductIdToAdd());
    if (!selectedProduct) {
      return 'Produto indisponível';
    }

    return `${selectedProduct.code} - ${selectedProduct.name}`;
  }

  protected goToPreviousCatalogPage(): void {
    if (!this.canGoToPreviousCatalogPage()) {
      return;
    }

    this.loadProductsCatalog(this.catalogPage() - 1, this.catalogPageSize());
  }

  protected goToNextCatalogPage(): void {
    if (!this.canGoToNextCatalogPage()) {
      return;
    }

    this.loadProductsCatalog(this.catalogPage() + 1, this.catalogPageSize());
  }

  protected canGoToPreviousCatalogPage(): boolean {
    return !this.isLoadingProductsCatalog() && this.catalogPage() > 1;
  }

  protected canGoToNextCatalogPage(): boolean {
    return !this.isLoadingProductsCatalog() && this.catalogPage() < this.catalogTotalPages();
  }

  protected onCatalogPageSizeChange(rawValue: string | number): void {
    const parsedPageSize = Number(rawValue);
    if (!Number.isInteger(parsedPageSize) || parsedPageSize < 1) {
      return;
    }

    this.catalogPageSize.set(parsedPageSize);
    this.loadProductsCatalog(1, parsedPageSize);
  }

  protected addSelectedProduct(): void {
    const invoice = this.invoice();

    if (!invoice) {
      return;
    }

    if (!this.canManageItems(invoice)) {
      this.errorMessage.set('Nota fiscal fechada não pode ser alterada.');
      return;
    }

    const selectedProductId = this.selectedProductIdToAdd().trim();

    if (!selectedProductId) {
      this.errorMessage.set('Selecione um produto para adicionar na nota.');
      return;
    }

    if (invoice.products.some((item) => item.productId === selectedProductId)) {
      this.errorMessage.set('Este produto já está na nota fiscal. Use o campo de quantidade para ajustar.');
      return;
    }

    const quantity = this.normalizeQuantity(this.quantityToAdd());
    if (quantity === null) {
      this.errorMessage.set('A quantidade deve ser um número inteiro de no mínimo 1 unidade.');
      this.quantityToAdd.set(1);
      return;
    }


    this.isAddingProduct.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.invoicesApiService
      .updateItems(invoice.id, {
        products: [{ productId: selectedProductId, quantity }]
      })
      .pipe(finalize(() => this.isAddingProduct.set(false)))
      .subscribe({
        next: (updatedInvoice) => {
          this.handleInvoiceUpdated(updatedInvoice);
          this.clearAddProductSelection();
          this.isAddProductModalOpen.set(false);
          this.successMessage.set('Produto adicionado à nota fiscal com sucesso.');
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.getFriendlyErrorMessage(error));
        }
      });
  }

  protected commitItemQuantity(productId: string, rawValue: string | number): void {
    const invoice = this.invoice();

    if (!invoice) {
      return;
    }

    const currentItem = invoice.products.find((item) => item.productId === productId);
    if (!currentItem) {
      this.errorMessage.set('Produto não encontrado na nota fiscal.');
      return;
    }

    const normalizedQuantity = this.normalizeQuantity(rawValue);
    if (normalizedQuantity === null) {
      this.errorMessage.set('Informe uma quantidade válida (número inteiro com mínimo de 1 unidade).');
      this.editableItemQuantities.update((current) => ({
        ...current,
        [productId]: currentItem.quantity
      }));
      return;
    }

    this.editableItemQuantities.update((current) => ({
      ...current,
      [productId]: normalizedQuantity
    }));

    if (normalizedQuantity === currentItem.quantity) {
      return;
    }

    this.updateProductQuantity(productId, normalizedQuantity);
  }

  protected removeProduct(productId: string): void {
    const invoice = this.invoice();

    if (!invoice) {
      return;
    }

    if (!this.canManageItems(invoice)) {
      this.errorMessage.set('Nota fiscal fechada não pode ser alterada.');
      return;
    }

    this.removingProductId.set(productId);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.invoicesApiService
      .removeProduct(invoice.id, productId)
      .pipe(finalize(() => this.removingProductId.set(null)))
      .subscribe({
        next: () => {
          this.loadInvoice(invoice.id);
          this.successMessage.set('Produto removido da nota fiscal com sucesso.');
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
          this.editedCustomerName.set(invoice.customerName);
          this.editedCustomerDocument.set(invoice.customerDocument);
          this.syncEditableItemQuantities(invoice);
          this.loadProductNames(invoice);

        },
        error: (error: HttpErrorResponse) => {
          this.invoice.set(null);
          this.productNamesById.set({});
          this.productCodesById.set({});
          this.successMessage.set(null);
          this.errorMessage.set(this.getFriendlyErrorMessage(error));
        }
      });
  }

  private loadProductNames(invoice: Invoice): void {
    const uniqueProductIds = [...new Set(invoice.products.map((item) => item.productId).filter(Boolean))];

    if (uniqueProductIds.length === 0) {
      this.productNamesById.set({});
      this.productCodesById.set({});
      return;
    }

    this.productsApiService.getByIds(uniqueProductIds).subscribe({
      next: (products) => {
        const namesLookup = uniqueProductIds.reduce<Record<string, string>>((accumulator, productId) => {
          accumulator[productId] = productId;
          return accumulator;
        }, {});
        const codesLookup = uniqueProductIds.reduce<Record<string, string>>((accumulator, productId) => {
          accumulator[productId] = '-';
          return accumulator;
        }, {});

        products.forEach((product) => {
          namesLookup[product.id] = product.name;
          codesLookup[product.id] = product.code;
        });

        this.productNamesById.set(namesLookup);
        this.productCodesById.set(codesLookup);
      },
      error: () => {
        const fallbackNamesLookup = uniqueProductIds.reduce<Record<string, string>>((accumulator, productId) => {
          accumulator[productId] = productId;
          return accumulator;
        }, {});
        const fallbackCodesLookup = uniqueProductIds.reduce<Record<string, string>>((accumulator, productId) => {
          accumulator[productId] = '-';
          return accumulator;
        }, {});

        this.productNamesById.set(fallbackNamesLookup);
        this.productCodesById.set(fallbackCodesLookup);
      }
    });
  }

  private loadProductsCatalog(page = this.catalogPage(), pageSize = this.catalogPageSize()): void {
    this.isLoadingProductsCatalog.set(true);

    this.productsApiService
      .list(page, pageSize)
      .pipe(finalize(() => this.isLoadingProductsCatalog.set(false)))
      .subscribe({
        next: (response) => {
          this.productsCatalog.set(response.items);
          this.catalogPage.set(response.page);
          this.catalogPageSize.set(response.pageSize);
          this.catalogTotalItems.set(response.totalItems);
          this.catalogTotalPages.set(response.totalPages);
        },
        error: () => {
          this.productsCatalog.set([]);
          this.catalogTotalItems.set(0);
          this.catalogTotalPages.set(0);
        }
      });
  }

  private updateProductQuantity(productId: string, quantity: number): void {
    const invoice = this.invoice();

    if (!invoice) {
      return;
    }

    if (!this.canManageItems(invoice)) {
      this.errorMessage.set('Nota fiscal fechada não pode ser alterada.');
      return;
    }

    if (quantity < 1) {
      this.errorMessage.set('A quantidade deve ser de no mínimo 1 unidade.');
      return;
    }

    this.updatingProductId.set(productId);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.invoicesApiService
      .updateItems(invoice.id, {
        products: [{ productId, quantity }]
      })
      .pipe(finalize(() => this.updatingProductId.set(null)))
      .subscribe({
        next: (updatedInvoice) => {
          this.handleInvoiceUpdated(updatedInvoice);
          this.successMessage.set('Quantidade do produto atualizada com sucesso.');
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.getFriendlyErrorMessage(error));
        }
      });
  }

  private handleInvoiceUpdated(updatedInvoice: Invoice): void {
    this.invoice.set(updatedInvoice);
    this.syncEditableItemQuantities(updatedInvoice);
    this.loadProductNames(updatedInvoice);
  }
  private syncEditableItemQuantities(invoice: Invoice): void {
    const quantities = invoice.products.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.productId] = item.quantity;
      return accumulator;
    }, {});

    this.editableItemQuantities.set(quantities);
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

  private clearAddProductSelection(): void {
    this.selectedProductIdToAdd.set('');
    this.quantityToAdd.set(1);
    this.errorMessage.set(null);
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

}