import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { DEFAULT_PAGE_SIZE_OPTIONS, PaginationControlsComponent } from '../../../core/components/pagination/pagination-controls.component';
import { BaseModalComponent } from '../../../core/components/modal/base-modal.component';
import { mapHttpErrorMessage } from '../../../core/http/http-error-mapper';
import { ProblemDetails } from '../../../core/models/problem-details.model';
import { PaginatedListStore } from '../../../core/state/paginated-list.store';
import { ProductFormComponent } from '../components/product-form.component';
import { ProductsTableComponent } from '../components/products-table.component';
import { ProductsApiService } from '../data/products-api.service';
import { CreateProductRequest } from '../models/create-product-request.model';
import { Product } from '../models/product.model';
import { UpdateProductRequest } from '../models/update-product-request.model';

type ProductFormMode = 'create' | 'edit';
type AvailabilityTone = 'low' | 'medium' | 'ok';

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [CommonModule, ProductsTableComponent, ProductFormComponent, PaginationControlsComponent, BaseModalComponent],
  styleUrl: './products-page.component.scss',
  templateUrl: './products-page.component.html',
})
export class ProductsPageComponent implements OnInit, OnDestroy {
  private readonly productsApiService = inject(ProductsApiService);
  private readonly paginatedProducts = new PaginatedListStore<Product>({
    initialPageSize: DEFAULT_PAGE_SIZE_OPTIONS[0],
    loader: ({ page, pageSize }) => this.productsApiService.list(page, pageSize),
    mapError: (error) => this.getFriendlyErrorMessage(error),
  });

  readonly skeletonRows = Array.from({ length: 5 }, (_, index) => index);
  readonly products = this.paginatedProducts.items;
  readonly isLoading = this.paginatedProducts.loading;
  readonly errorMessage = this.paginatedProducts.error;
  readonly page = this.paginatedProducts.page;
  readonly pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;
  readonly pageSize = this.paginatedProducts.pageSize;
  readonly totalItems = this.paginatedProducts.totalItems;
  readonly totalPages = this.paginatedProducts.totalPages;
  readonly isSaving = signal(false);
  readonly isDeletingId = signal<string | null>(null);
  readonly formApiErrorMessage = signal<string | null>(null);
  readonly formApiFieldErrors = signal<Partial<Record<keyof CreateProductRequest, string>>>({});
  readonly isDrawerOpen = signal(false);
  readonly drawerMode = signal<ProductFormMode>('create');
  readonly selectedProduct = signal<Product | null>(null);

  readonly isInitialLoading = computed(() => this.isLoading() && this.products().length === 0);
  readonly totalStock = computed(() => this.products().reduce((acc, product) => acc + product.stock, 0));
  readonly totalAvailable = computed(() => this.products().reduce((acc, product) => acc + product.availableQuantity, 0));

  ngOnInit(): void {
    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.paginatedProducts.destroy();
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
    this.paginatedProducts.load();
  }

  goToPreviousPage(): void {
    this.paginatedProducts.previousPage();
  }

  goToNextPage(): void {
    this.paginatedProducts.nextPage();
  }

  canGoToPreviousPage(): boolean {
    return this.paginatedProducts.canGoPrevious();
  }

  canGoToNextPage(): boolean {
    return this.paginatedProducts.canGoNext();
  }

  onPageSizeChange(nextPageSize: number): void {
    this.paginatedProducts.setPageSize(nextPageSize);
  }

  trackByProductId(_: number, product: Product): string {
    return product.id;
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

  submitForm(payload: CreateProductRequest | UpdateProductRequest): void {
    this.isSaving.set(true);
    this.formApiErrorMessage.set(null);
    this.formApiFieldErrors.set({});

    if (this.drawerMode() === 'create') {
      this.productsApiService
        .create(payload as CreateProductRequest)
        .pipe(finalize(() => this.isSaving.set(false)))
        .subscribe({
          next: () => {
            this.closeDrawer();
            this.loadProducts();
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
        next: () => {
          this.closeDrawer();
          this.loadProducts();
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
        next: () => {
          const projectedTotalItems = Math.max(this.totalItems() - 1, 0);
          const projectedTotalPages = projectedTotalItems === 0 ? 0 : Math.ceil(projectedTotalItems / this.pageSize());
          const nextPage = projectedTotalPages > 0 ? Math.min(this.page(), projectedTotalPages) : 1;

          this.paginatedProducts.load({ page: nextPage });
        },
        error: (error: HttpErrorResponse) => {
          window.alert(this.getFriendlyErrorMessage(error));
        },
      });
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
    return mapHttpErrorMessage(error, { domain: 'products' });
  }
}