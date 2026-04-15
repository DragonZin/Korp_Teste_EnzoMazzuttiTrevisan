import { CommonModule, CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { PagedResponse } from '../../../core/models/paged-response.model';
import { ProblemDetails } from '../../../core/models/problem-details.model';
import { ProductsApiService } from '../data/products-api.service';
import { Product } from '../models/product.model';

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
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
            <button type="button" class="btn btn-primary">Novo produto</button>
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
                  <button type="button" class="btn btn-sm btn-outline-secondary">Editar</button>
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
  `,
})
export class ProductsPageComponent implements OnInit {
  private readonly productsApiService = inject(ProductsApiService);

  readonly products = signal<Product[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly totalPages = signal(0);

  ngOnInit(): void {
    this.loadProducts();
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