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
  templateUrl: './products-table.component.html',
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