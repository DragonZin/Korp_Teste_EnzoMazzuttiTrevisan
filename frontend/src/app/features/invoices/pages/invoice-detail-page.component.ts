import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { mapHttpErrorMessage } from '../../../core/http/http-error-mapper';
import { InvoicesApiService } from '../data/invoices-api.service';
import { Invoice } from '../models/invoice.model';
import { ProductsApiService } from '../../products/data/products-api.service';
import { InvoiceProductLookupService } from '../data/invoice-product-lookup.service';
import { Product } from '../../products/models/product.model';
import { QuantityStepperComponent } from '../components/quantity-stepper.component';
import { BaseModalComponent } from '../../../core/components/modal/base-modal.component';
import { InvoiceSummaryCardComponent } from '../components/invoice-summary-card.component';
import { DEFAULT_PAGE_SIZE_OPTIONS, PaginationControlsComponent } from '../../../core/components/pagination/pagination-controls.component';
import { ProductsTableComponent } from '../../products/components/products-table.component';

@Component({
  selector: 'app-invoice-detail-page',
  standalone: true,
  imports: [CommonModule, QuantityStepperComponent, BaseModalComponent, InvoiceSummaryCardComponent, PaginationControlsComponent, ProductsTableComponent],
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
            <app-invoice-summary-card [invoice]="invoice" mode="editable">
              <div invoice-customer-field class="d-flex align-items-start gap-2 editable-field-wrap">
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
              <div invoice-customer-field class="mt-2 no-print" *ngIf="isEditingCustomerName()">
                <button type="button" class="btn btn-outline-secondary btn-sm" (click)="cancelEditingCustomerName()">
                  Cancelar
                </button>
              </div>

              <div invoice-document-field class="d-flex align-items-start gap-2 editable-field-wrap">
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
              <div invoice-document-field class="mt-2 no-print" *ngIf="isEditingCustomerDocument()">
                <button type="button" class="btn btn-outline-secondary btn-sm" (click)="cancelEditingCustomerDocument()">
                  Cancelar
                </button>
              </div>
            </app-invoice-summary-card>

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

            <div class="d-flex justify-content-end mt-3 no-print" *ngIf="canManageItems(invoice)">
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
        </ng-container>

        <p *ngIf="!isLoading() && !invoice() && !errorMessage()" class="text-body-secondary mb-0">
          Nenhuma nota fiscal encontrada para o identificador informado.
        </p>

      </div>
    </section>
    <app-base-modal
      [isOpen]="isAddProductModalOpen()"
      class="no-print"
      title="Adicionar produto"
      subtitle="Selecione um ou mais itens do catálogo para incluir na nota fiscal."
      size="lg"
      [closeOnBackdropClick]="!isAddingProduct()"
      (closed)="closeAddProductModal()"
    >
        <div *ngIf="addProductModalError() as addProductError" class="alert alert-danger" role="alert">
          {{ addProductError }}
        </div>

        <div *ngIf="isLoadingProductsCatalog()" class="small text-body-secondary mb-2">Carregando catálogo...</div>

        <app-products-table
          [products]="productsCatalog()"
          [isLoading]="isLoadingProductsCatalog()"
          [showQuantitySelector]="true"
          [showActions]="true"
          quantitySelectorHeader="Quantidade"
          actionsHeader="Ação"
          emptyMessage="Nenhum produto disponível no catálogo."
          [quantitySelectorTemplate]="catalogQuantityCell"
          [actionsTemplate]="catalogActionCell"
        />

        <ng-template #catalogQuantityCell let-product>
          <ng-container *ngIf="isProductSelectedToAdd(product.id); else unselectedCatalogProduct">
            <app-quantity-stepper
              [value]="getSelectedProductQuantity(product.id)"
              [min]="1"
              [disabled]="isAddingProduct()"
              inputAriaLabel="Quantidade para adicionar do produto {{ product.name }}"
              (commit)="commitSelectedProductQuantity(product.id, $event)"
            />
          </ng-container>
          <ng-template #unselectedCatalogProduct>-</ng-template>
        </ng-template>

        <ng-template #catalogActionCell let-product>
          <div class="form-check d-inline-flex justify-content-end m-0">
            <input
              class="form-check-input"
              type="checkbox"
              [id]="'catalog-product-' + product.id"
              [checked]="isProductSelectedToAdd(product.id)"
              [disabled]="isAddingProduct()"
              (change)="selectProductToAdd(product)"
            />
          </div>
        </ng-template>

        <app-pagination-controls
          [currentItemCount]="productsCatalog().length"
          [totalItems]="catalogTotalItems()"
          [page]="catalogPage()"
          [totalPages]="catalogTotalPages() || 1"
          [pageSize]="catalogPageSize()"
          [pageSizeOptions]="catalogPageSizeOptions"
          [isLoading]="isLoadingProductsCatalog()"
          pageSizeId="catalog-page-size"
          ariaLabel="Paginação do catálogo de produtos"
          containerClass="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2"
          summaryClass="small text-body-secondary mb-0"
          controlsClass="d-flex align-items-center gap-2"
          pageSizeLabelClass="small text-body-secondary mb-0"
          (previous)="goToPreviousCatalogPage()"
          (next)="goToNextCatalogPage()"
          (pageSizeChange)="onCatalogPageSizeChange($event)"
        />

        <div class="modal-confirmation border-top mt-3 pt-3">
          <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <p class="mb-1 fw-semibold">{{ getAddProductSelectionSummary() }}</p>
              <p class="text-body-secondary mb-0 small">Defina a quantidade para cada item selecionado antes de confirmar.</p>
            </div>
            <div>
              <button
                type="button"
                class="btn btn-primary"
                (click)="addSelectedProduct()"
                [disabled]="isAddingProduct() || selectedProductIdsToAdd().length === 0"
              >
                {{ isAddingProduct() ? 'Adicionando...' : 'Confirmar adição' }}
              </button>
            </div>
          </div>
        </div>
    </app-base-modal>
  `,
  styleUrl: './invoice-detail-page.component.scss',
})
export class InvoiceDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly invoicesApiService = inject(InvoicesApiService);
  private readonly productsApiService = inject(ProductsApiService);
  private readonly invoiceProductLookupService = inject(InvoiceProductLookupService);
  
  protected readonly invoiceId = signal('');
  protected readonly invoice = signal<Invoice | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly addProductModalError = signal<string | null>(null);
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
  protected readonly selectedProductIdsToAdd = signal<string[]>([]);
  protected readonly selectedProductQuantitiesToAdd = signal<Record<string, number>>({});
  protected readonly isAddProductModalOpen = signal(false);
  protected readonly catalogPage = signal(1);
  protected readonly catalogPageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;
  protected readonly catalogPageSize = signal(this.catalogPageSizeOptions[0]);
  protected readonly catalogTotalItems = signal(0);
  protected readonly catalogTotalPages = signal(0);
  protected readonly catalogSearchTerm = signal('');
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

  protected openAddProductModal(): void {
    if (this.isAddingProduct()) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.addProductModalError.set(null);
    this.clearAddProductSelection();
    this.isAddProductModalOpen.set(true);
    this.loadProductsCatalog();
  }

  protected closeAddProductModal(): void {
    if (this.isAddingProduct()) {
      return;
    }

    this.clearAddProductSelection();
    this.addProductModalError.set(null);
    this.isAddProductModalOpen.set(false);
  }

  protected selectProductToAdd(product: Product): void {
    this.errorMessage.set(null);
    this.addProductModalError.set(null);
    this.successMessage.set(null);
    const productId = product.id;

    this.selectedProductIdsToAdd.update((selectedIds) => (
      selectedIds.includes(productId)
        ? selectedIds.filter((selectedId) => selectedId !== productId)
        : [...selectedIds, productId]
    ));

    this.selectedProductQuantitiesToAdd.update((selectedQuantities) => {
      if (productId in selectedQuantities) {
        const { [productId]: _, ...remainingQuantities } = selectedQuantities;
        return remainingQuantities;
      }

      return {
        ...selectedQuantities,
        [productId]: 1
      };
    });
  }

  protected isProductSelectedToAdd(productId: string): boolean {
    return this.selectedProductIdsToAdd().includes(productId);
  }

  protected getAddProductSelectionSummary(): string {
    const totalSelected = this.selectedProductIdsToAdd().length;
    if (totalSelected === 0) {
      return 'Nenhum produto selecionado';
    }

    return `${totalSelected} ${totalSelected === 1 ? 'produto selecionado' : 'produtos selecionados'}`;
  }

  protected getSelectedProductQuantity(productId: string): number {
    return this.selectedProductQuantitiesToAdd()[productId] ?? 1;
  }

  protected commitSelectedProductQuantity(productId: string, rawValue: string | number): void {
    const parsedQuantity = this.normalizeQuantity(rawValue);
    if (parsedQuantity === null) {
      this.addProductModalError.set('Informe uma quantidade válida (número inteiro com mínimo de 1 unidade).');
      return;
    }

    this.addProductModalError.set(null);
    this.selectedProductQuantitiesToAdd.update((selectedQuantities) => ({
      ...selectedQuantities,
      [productId]: parsedQuantity
    }));
  }

  protected goToPreviousCatalogPage(): void {
    if (this.isLoadingProductsCatalog() || this.catalogPage() <= 1) {
      return;
    }

    this.loadProductsCatalog(this.catalogPage() - 1, this.catalogPageSize());
  }

  protected goToNextCatalogPage(): void {
    if (this.isLoadingProductsCatalog() || this.catalogPage() >= this.catalogTotalPages()) {
      return;
    }

    this.loadProductsCatalog(this.catalogPage() + 1, this.catalogPageSize());
  }

  protected onCatalogPageSizeChange(pageSize: number): void {
    if (!Number.isInteger(pageSize) || pageSize < 1) {
      return;
    }

    this.catalogPageSize.set(pageSize);
    this.loadProductsCatalog(1, pageSize);
  }

  protected addSelectedProduct(): void {
    const invoice = this.invoice();

    if (!invoice) {
      return;
    }

    if (!this.canManageItems(invoice)) {
      this.addProductModalError.set('Nota fiscal fechada não pode ser alterada.');
      return;
    }

    const selectedProductIds = this.selectedProductIdsToAdd().map((productId) => productId.trim()).filter(Boolean);

    if (selectedProductIds.length === 0) {
      this.addProductModalError.set('Selecione ao menos um produto para adicionar na nota fiscal.');
      return;
    }

    const duplicatedIds = selectedProductIds.filter((productId) => (
      invoice.products.some((item) => item.productId === productId)
    ));
    if (duplicatedIds.length > 0) {
      this.addProductModalError.set('Um ou mais produtos selecionados já estão na nota fiscal. Ajuste a seleção e tente novamente.');
      return;
    }

    const selectedProductQuantities = this.selectedProductQuantitiesToAdd();
    const products = selectedProductIds.map((productId) => ({
      productId,
      quantity: selectedProductQuantities[productId] ?? 1
    }));

    this.isAddingProduct.set(true);
    this.errorMessage.set(null);
    this.addProductModalError.set(null);
    this.successMessage.set(null);

    this.invoicesApiService
      .updateItems(invoice.id, {
        products
      })
      .pipe(finalize(() => this.isAddingProduct.set(false)))
      .subscribe({
        next: (updatedInvoice) => {
          this.handleInvoiceUpdated(updatedInvoice);
          this.clearAddProductSelection();
          this.addProductModalError.set(null);
          this.isAddProductModalOpen.set(false);
          this.successMessage.set('Produtos adicionados à nota fiscal com sucesso.');
        },
        error: (error: HttpErrorResponse) => {
          this.addProductModalError.set(this.getFriendlyErrorMessage(error));
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
    const productIds = invoice.products.map((item) => item.productId);

    this.invoiceProductLookupService.getLookupByProductIds(productIds).subscribe(({ namesById, codesById }) => {
      this.productNamesById.set(namesById);
      this.productCodesById.set(codesById);
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
    this.selectedProductIdsToAdd.set([]);
    this.selectedProductQuantitiesToAdd.set({});
  }

  private getFriendlyErrorMessage(error: HttpErrorResponse): string {
    return mapHttpErrorMessage(error, { domain: 'invoice-detail' });
  }
}