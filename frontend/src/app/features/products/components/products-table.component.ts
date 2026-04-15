import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, Input, TemplateRef } from '@angular/core';

import { Product } from '../models/product.model';

export interface ProductsTableCellContext {
  $implicit: Product;
  product: Product;
}

@Component({
  selector: 'app-products-table',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  template: `
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Nome</th>
            <th class="text-end">Estoque</th>
            <th class="text-end" *ngIf="showAvailableQuantity">Qtd. disponível</th>
            <th class="text-end">Preço</th>
            <th class="text-end" *ngIf="showQuantitySelector">{{ quantitySelectorHeader }}</th>
            <th class="text-end" *ngIf="showActions">{{ actionsHeader }}</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let product of products; trackBy: trackByProductId">
            <td>{{ product.code }}</td>
            <td>{{ product.name }}</td>
            <td class="text-end">{{ product.stock }}</td>

            <td class="text-end" *ngIf="showAvailableQuantity">
              <ng-container
                *ngIf="availableQuantityTemplate; else defaultAvailableQuantity"
                [ngTemplateOutlet]="availableQuantityTemplate"
                [ngTemplateOutletContext]="{ $implicit: product, product: product }"
              />
              <ng-template #defaultAvailableQuantity>
                {{ product.availableQuantity }}
              </ng-template>
            </td>

            <td class="text-end">
              {{ product.price | currency: 'BRL' : 'symbol' : '1.2-2' : 'pt-BR' }}
            </td>

            <td class="text-end" *ngIf="showQuantitySelector">
              <ng-container
                *ngIf="quantitySelectorTemplate"
                [ngTemplateOutlet]="quantitySelectorTemplate"
                [ngTemplateOutletContext]="{ $implicit: product, product: product }"
              />
            </td>

            <td class="text-end" *ngIf="showActions">
              <ng-container
                *ngIf="actionsTemplate"
                [ngTemplateOutlet]="actionsTemplate"
                [ngTemplateOutletContext]="{ $implicit: product, product: product }"
              />
            </td>
          </tr>

          <tr *ngIf="!isLoading && products.length === 0">
            <td [attr.colspan]="visibleColumnsCount()" class="text-center text-body-secondary py-4">
              {{ emptyMessage }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
})
export class ProductsTableComponent {
  @Input({ required: true }) products: Product[] = [];
  @Input() isLoading = false;
  @Input() emptyMessage = 'Nenhum produto encontrado.';

  @Input() showAvailableQuantity = true;
  @Input() showQuantitySelector = false;
  @Input() showActions = false;

  @Input() quantitySelectorHeader = 'Quantidade';
  @Input() actionsHeader = 'Ações';

  @Input() availableQuantityTemplate?: TemplateRef<ProductsTableCellContext>;
  @Input() quantitySelectorTemplate?: TemplateRef<ProductsTableCellContext>;
  @Input() actionsTemplate?: TemplateRef<ProductsTableCellContext>;

  protected visibleColumnsCount(): number {
    let count = 4; // SKU, Nome, Estoque, Preço

    if (this.showAvailableQuantity) {
      count += 1;
    }

    if (this.showQuantitySelector) {
      count += 1;
    }

    if (this.showActions) {
      count += 1;
    }

    return count;
  }

  protected trackByProductId(_: number, product: Product): string {
    return product.id;
  }
}