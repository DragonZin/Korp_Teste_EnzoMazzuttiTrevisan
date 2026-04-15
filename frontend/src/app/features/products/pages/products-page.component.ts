import { CommonModule, CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { PagedResponse } from '../../../core/models/paged-response.model';
import { ProblemDetails } from '../../../core/models/problem-details.model';
import { ProductFormComponent } from '../components/product-form.component';
import { ProductsApiService } from '../data/products-api.service';
import { CreateProductRequest } from '../models/create-product-request.model';
import { Product } from '../models/product.model';
import { UpdateProductRequest } from '../models/update-product-request.model';

type ProductFormMode = 'create' | 'edit';
type AvailabilityTone = 'low' | 'medium' | 'ok';

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, ProductFormComponent],
  styleUrl: './products-page.component.scss',
  template: `
    <section class="card border-0 shadow-sm">
      <div class="card-body">
        <div class="page-header">
          <div>
            <h2 class="h5 mb-1">Produtos</h2>
            <p class="text-body-secondary mb-0">Listagem e manutenção de produtos.</p>
          </div>

          <div class="page-header__actions">
            <button
              type="button"
              class="btn btn-outline-secondary"
              (click)="loadProducts()"
              [disabled]="isLoading()"
            >
              Recarregar
            </button>
            <button type="button" class="btn btn-primary" (click)="openCreateDrawer()">Novo produto</button>
          </div>
        </div>

        <div class="kpi-grid mb-3" *ngIf="!isInitialLoading()">
          <article class="kpi-card">
            <p class="kpi-card__label">Total de produtos</p>
            <p class="kpi-card__value">{{ totalItems() }}</p>
          </article>

          <article class="kpi-card">
            <p class="kpi-card__label">Estoque total (página)</p>
            <p class="kpi-card__value">{{ totalStock() }}</p>
          </article>

          <article class="kpi-card">
            <p class="kpi-card__label">Disponível (página)</p>
            <p class="kpi-card__value">{{ totalAvailable() }}</p>
          </article>
        </div>

        <div *ngIf="errorMessage() as error" class="alert alert-danger" role="alert">
          {{ error }}
        </div>

        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nome</th>
                <th class="text-end">Estoque</th>
                <th class="text-end">Qtd. disponível</th>
                <th class="text-end">Preço</th>
                <th class="text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              <ng-container *ngIf="isInitialLoading(); else productsBody">
                <tr *ngFor="let row of skeletonRows">
                  <td colspan="6" class="py-2">
                    <div class="skeleton-row">
                      <span class="placeholder skeleton-cell skeleton-cell--sm"></span>
                      <span class="placeholder skeleton-cell"></span>
                      <span class="placeholder skeleton-cell skeleton-cell--xs"></span>
                      <span class="placeholder skeleton-cell skeleton-cell--xs"></span>
                      <span class="placeholder skeleton-cell skeleton-cell--xs"></span>
                    </div>
                  </td>
                </tr>
              </ng-container>

              <ng-template #productsBody>
                <tr *ngFor="let product of products()">
                  <td>{{ product.code }}</td>
                  <td>{{ product.name }}</td>
                  <td class="text-end">{{ product.stock }}</td>
                  <td class="text-end">
                    <div class="available-wrap">
                      <span>{{ product.availableQuantity }}</span>
                      <span class="badge" [ngClass]="availabilityClass(product)">
                        {{ availabilityLabel(product) }}
                      </span>
                    </div>
                  </td>
                  <td class="text-end">
                    {{ product.price | currency: 'BRL' : 'symbol' : '1.2-2' : 'pt-BR' }}
                  </td>
                  <td class="text-end">
                    <div class="action-buttons">
                      <button type="button" class="btn btn-sm btn-outline-secondary" (click)="openEditDrawer(product)">
                        Editar
                      </button>
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-danger"
                        (click)="deleteProduct(product)"
                        [disabled]="isDeletingId() === product.id"
                      >
                        {{ isDeletingId() === product.id ? 'Excluindo...' : 'Excluir' }}
                      </button>
                    </div>
                  </td>
                </tr>

                <tr *ngIf="!isLoading() && products().length === 0">
                  <td colspan="6" class="text-center text-body-secondary py-5 empty-state">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              </ng-template>
            </tbody>
          </table>
        </div>

        <div *ngIf="isLoading() && !isInitialLoading()" class="small text-body-secondary mt-2" aria-live="polite">
          Atualizando lista...
        </div>

        <div
          class="d-flex flex-wrap justify-content-between align-items-center gap-3 mt-3"
          *ngIf="!isInitialLoading() && totalItems() > 0"
        >
          <p class="text-body-secondary mb-0">
            Exibindo {{ products().length }} de {{ totalItems() }} itens (página {{ page() }} de
            {{ totalPages() }}).
          </p>

          <div class="d-flex flex-wrap align-items-center gap-2">
            <label class="form-label mb-0 text-body-secondary" for="products-page-size">Itens por página</label>
            <select
              id="products-page-size"
              class="form-select form-select-sm page-size-select"
              [value]="pageSize()"
              (change)="onPageSizeChange($event)"
            >
              <option *ngFor="let size of pageSizeOptions" [value]="size">{{ size }}</option>
            </select>

            <div class="btn-group btn-group-sm" role="group" aria-label="Paginação de produtos">
              <button
                type="button"
                class="btn btn-outline-secondary"
                (click)="goToPreviousPage()"
                [disabled]="!canGoToPreviousPage()"
              >
                Anterior
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary"
                (click)="goToNextPage()"
                [disabled]="!canGoToNextPage()"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div *ngIf="isDrawerOpen()" class="overlay" (click)="closeDrawer()" aria-hidden="true"></div>

    <aside *ngIf="isDrawerOpen()" class="drawer p-4" role="dialog" aria-modal="true">
      <div class="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h3 class="h5 mb-1">{{ drawerMode() === 'create' ? 'Novo produto' : 'Editar produto' }}</h3>
          <p class="text-body-secondary mb-0">Preencha os campos para salvar.</p>
        </div>
        <button type="button" class="btn-close" aria-label="Fechar" (click)="closeDrawer()"></button>
      </div>

      <app-product-form
        [product]="selectedProduct()"
        [isSubmitting]="isSaving()"
        [apiErrorMessage]="formApiErrorMessage()"
        [apiFieldErrors]="formApiFieldErrors()"
        (submitted)="submitForm($event)"
        (cancelled)="closeDrawer()"
      />
    </aside>
  `,
})
export class ProductsPageComponent implements OnInit {
  private readonly productsApiService = inject(ProductsApiService);
  readonly pageSizeOptions = [25, 50, 75, 100] as const;
  readonly skeletonRows = Array.from({ length: 5 }, (_, index) => index);

  readonly products = signal<Product[]>([]);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isDeletingId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly formApiErrorMessage = signal<string | null>(null);
  readonly formApiFieldErrors = signal<Partial<Record<keyof CreateProductRequest, string>>>({});
  readonly isDrawerOpen = signal(false);
  readonly drawerMode = signal<ProductFormMode>('create');
  readonly selectedProduct = signal<Product | null>(null);
  readonly page = signal(1);
  readonly pageSize = signal<number>(this.pageSizeOptions[0]);
  readonly totalItems = signal(0);
  readonly totalPages = signal(0);

  readonly isInitialLoading = computed(() => this.isLoading() && this.products().length === 0);
  readonly totalStock = computed(() => this.products().reduce((acc, product) => acc + product.stock, 0));
  readonly totalAvailable = computed(() => this.products().reduce((acc, product) => acc + product.availableQuantity, 0));

  ngOnInit(): void {
    this.loadProducts();
  }

  openCreateDrawer(): void {
    this.drawerMode.set('create');
    this.selectedProduct.set(null);
    this.formApiFieldErrors.set({});
    this.formApiErrorMessage.set(null);
    this.isDrawerOpen.set(true);
  }

  openEditDrawer(product: Product): void {
    this.drawerMode.set('edit');
    this.selectedProduct.set(product);
    this.formApiFieldErrors.set({});
    this.formApiErrorMessage.set(null);
    this.isDrawerOpen.set(true);
  }

  closeDrawer(): void {
    if (this.isSaving()) {
      return;
    }

    this.isDrawerOpen.set(false);
    this.formApiErrorMessage.set(null);
    this.formApiFieldErrors.set({});
  }

  loadProducts(): void {
    this.loadProductsBy(this.page(), this.pageSize());
  }

  goToPreviousPage(): void {
    if (!this.canGoToPreviousPage()) {
      return;
    }

    this.loadProductsBy(this.page() - 1, this.pageSize());
  }

  goToNextPage(): void {
    if (!this.canGoToNextPage()) {
      return;
    }

    this.loadProductsBy(this.page() + 1, this.pageSize());
  }

  canGoToPreviousPage(): boolean {
    return !this.isLoading() && this.page() > 1;
  }

  canGoToNextPage(): boolean {
    return !this.isLoading() && this.page() < this.totalPages();
  }

  onPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    const nextPageSize = Number(target?.value);

    if (!Number.isFinite(nextPageSize) || !this.pageSizeOptions.includes(nextPageSize as 25 | 50 | 75 | 100)) {
      return;
    }

    this.loadProductsBy(1, nextPageSize);
  }
  
  availabilityLabel(product: Product): string {
    const tone = this.getAvailabilityTone(product);

    if (tone === 'low') {
      return 'Baixo';
    }

    if (tone === 'medium') {
      return 'Médio';
    }

    return 'OK';
  }

  availabilityClass(product: Product): string {
    return `availability-badge availability-badge--${this.getAvailabilityTone(product)}`;
  }

  private loadProductsBy(page: number, pageSize: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.productsApiService
      .list(page, pageSize)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response: PagedResponse<Product>) => {
          this.products.set(response.items);
          this.page.set(response.page);
          this.pageSize.set(response.pageSize);
          this.totalItems.set(response.totalItems);
          this.totalPages.set(response.totalPages);
        },
        error: (error: HttpErrorResponse) => {
          this.products.set([]);
          this.totalItems.set(0);
          this.totalPages.set(0);
          this.errorMessage.set(this.getFriendlyErrorMessage(error));
        },
      });
  }

  submitForm(payload: CreateProductRequest | UpdateProductRequest): void {
    this.isSaving.set(true);
    this.formApiErrorMessage.set(null);
    this.formApiFieldErrors.set({});

    if (this.drawerMode() === 'create') {
      this.productsApiService
        .create(payload as CreateProductRequest)
        .pipe(finalize(() => this.isSaving.set(false)))
        .subscribe({
          next: (createdProduct) => {
            this.applyCreatedProduct(createdProduct);
            this.closeDrawer();
          },
          error: (error: HttpErrorResponse) => this.handleFormError(error),
        });
      return;
    }

    const product = this.selectedProduct();

    if (!product) {
      this.isSaving.set(false);
      return;
    }

    this.productsApiService
      .update(product.id, payload as UpdateProductRequest)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (updatedProduct) => {
          this.applyUpdatedProduct(updatedProduct);
          this.closeDrawer();
        },
        error: (error: HttpErrorResponse) => this.handleFormError(error),
      });
  }

  deleteProduct(product: Product): void {
    const confirmed = window.confirm(`Deseja excluir o produto "${product.name}"?`);

    if (!confirmed) {
      return;
    }

    this.isDeletingId.set(product.id);

    this.productsApiService
      .delete(product.id)
      .pipe(finalize(() => this.isDeletingId.set(null)))
      .subscribe({
        next: () => this.applyDeletedProduct(product.id),
        error: (error: HttpErrorResponse) => {
          window.alert(this.getFriendlyErrorMessage(error));
        },
      });
  }

  private applyCreatedProduct(product: Product): void {
    const sortedProducts = [product, ...this.products()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    this.products.set(sortedProducts.slice(0, this.pageSize()));

    this.totalItems.update((currentTotal) => currentTotal + 1);
    this.recalculateTotalPages();
  }

  private applyUpdatedProduct(updatedProduct: Product): void {
    this.products.update((currentProducts) =>
      currentProducts
        .map((product) => (product.id === updatedProduct.id ? updatedProduct : product))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    );

    if (this.selectedProduct()?.id === updatedProduct.id) {
      this.selectedProduct.set(updatedProduct);
    }
  }

  private applyDeletedProduct(productId: string): void {
    const beforeLength = this.products().length;
    const updatedProducts = this.products().filter((product) => product.id !== productId);

    if (updatedProducts.length === beforeLength) {
      return;
    }

    this.products.set(updatedProducts);
    this.totalItems.update((currentTotal) => Math.max(currentTotal - 1, 0));
    this.recalculateTotalPages();

    if (this.page() > this.totalPages()) {
      this.page.set(Math.max(this.totalPages(), 1));
    }
  }

  private recalculateTotalPages(): void {
    const totalItems = this.totalItems();
    const pageSize = this.pageSize();
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);
    this.totalPages.set(totalPages);
  }

  private getAvailabilityTone(product: Product): AvailabilityTone {
    if (product.stock <= 0 || product.availableQuantity <= 0) {
      return 'low';
    }

    const ratio = product.availableQuantity / product.stock;

    if (ratio <= 0.3) {
      return 'low';
    }

    if (ratio <= 0.7) {
      return 'medium';
    }

    return 'ok';
  }

  private handleFormError(error: HttpErrorResponse): void {
    const problemDetails = error.error as Partial<ProblemDetails> | null;
    const mappedFieldErrors = this.mapFieldErrors(problemDetails);

    this.formApiFieldErrors.set(mappedFieldErrors);

    const fallbackMessage = this.getFriendlyErrorMessage(error);
    const genericMessage =
      Object.keys(mappedFieldErrors).length > 0
        ? 'Existem campos inválidos. Revise os dados e tente novamente.'
        : fallbackMessage;

    this.formApiErrorMessage.set(genericMessage);

    if (Object.keys(mappedFieldErrors).length === 0) {
      window.alert(genericMessage);
    }
  }

  private mapFieldErrors(
    problemDetails: Partial<ProblemDetails> | null
  ): Partial<Record<keyof CreateProductRequest, string>> {
    const fieldErrors: Partial<Record<keyof CreateProductRequest, string>> = {};

    const errors = problemDetails?.errors;
    if (errors && typeof errors === 'object') {
      for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
        const normalized = key.toLowerCase();
        if (normalized === 'code' || normalized === 'name' || normalized === 'stock' || normalized === 'price') {
          fieldErrors[normalized] = Array.isArray(value) ? String(value[0]) : String(value);
        }
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      return fieldErrors;
    }

    const detail = (problemDetails?.detail ?? '').toLowerCase();

    if (detail.includes('código')) {
      fieldErrors.code = problemDetails?.detail ?? 'Código inválido.';
    } else if (detail.includes('nome')) {
      fieldErrors.name = problemDetails?.detail ?? 'Nome inválido.';
    } else if (detail.includes('estoque')) {
      fieldErrors.stock = problemDetails?.detail ?? 'Estoque inválido.';
    } else if (detail.includes('preço') || detail.includes('preco')) {
      fieldErrors.price = problemDetails?.detail ?? 'Preço inválido.';
    }

    return fieldErrors;
  }

  private getFriendlyErrorMessage(error: HttpErrorResponse): string {
    const problemDetails = error.error as Partial<ProblemDetails> | null;

    if (problemDetails?.detail) {
      return problemDetails.detail;
    }

    if (problemDetails?.title) {
      return problemDetails.title;
    }

    return 'Não foi possível carregar os produtos no momento. Tente novamente em instantes.';
  }
}