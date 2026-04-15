import { CommonModule, CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { PagedResponse } from '../../../core/models/paged-response.model';
import { ProblemDetails } from '../../../core/models/problem-details.model';
import { ProductFormComponent } from '../components/product-form.component';
import { ProductsApiService } from '../data/products-api.service';
import { CreateProductRequest } from '../models/create-product-request.model';
import { Product } from '../models/product.model';
import { UpdateProductRequest } from '../models/update-product-request.model';

type ProductFormMode = 'create' | 'edit';

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, ProductFormComponent],
  styles: [
    `
      .overlay {
        position: fixed;
        inset: 0;
        background-color: rgba(0, 0, 0, 0.4);
        z-index: 1040;
      }

      .drawer {
        position: fixed;
        top: 0;
        right: 0;
        height: 100vh;
        width: min(100%, 440px);
        background: var(--bs-body-bg);
        box-shadow: -8px 0 24px rgba(0, 0, 0, 0.2);
        z-index: 1050;
        overflow-y: auto;
      }
    `,
  ],
  template: `
    <section class="card border-0 shadow-sm">
      <div class="card-body">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h2 class="h5 mb-1">Produtos</h2>
            <p class="text-body-secondary mb-0">Listagem e manutenção de produtos.</p>
          </div>
          <div class="d-flex gap-2">
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

        <div *ngIf="errorMessage() as error" class="alert alert-danger" role="alert">
          {{ error }}
        </div>

        <div
          *ngIf="isLoading()"
          class="d-flex align-items-center gap-2 mb-3 text-body-secondary"
          aria-live="polite"
        >
          <div class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></div>
          <span>Carregando produtos...</span>
        </div>

        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nome</th>
                <th class="text-end">Preço</th>
                <th class="text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="isLoading()">
                <td colspan="4">
                  <div class="placeholder-glow">
                    <span class="placeholder col-12"></span>
                  </div>
                </td>
              </tr>

              <tr *ngFor="let product of products()">
                <td>{{ product.code }}</td>
                <td>{{ product.name }}</td>
                <td class="text-end">
                  {{ product.price | currency: 'BRL' : 'symbol' : '1.2-2' : 'pt-BR' }}
                </td>
                <td class="text-end">
                  <div class="d-inline-flex gap-2">
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
                <td colspan="4" class="text-center text-body-secondary py-4">
                  Nenhum produto encontrado.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="text-body-secondary mt-3 mb-0" *ngIf="!isLoading() && products().length > 0">
          Exibindo {{ products().length }} de {{ totalItems() }} itens (página {{ page() }} de
          {{ totalPages() }}).
        </p>
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
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly totalPages = signal(0);

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
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.productsApiService
      .list()
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
        next: () => this.loadProducts(),
        error: (error: HttpErrorResponse) => {
          window.alert(this.getFriendlyErrorMessage(error));
        },
      });
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