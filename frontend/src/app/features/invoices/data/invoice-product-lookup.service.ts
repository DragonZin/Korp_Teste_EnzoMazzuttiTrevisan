import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { ProductsApiService } from '../../products/data/products-api.service';

export type InvoiceProductLookup = {
  namesById: Record<string, string>;
  codesById: Record<string, string>;
};

@Injectable({ providedIn: 'root' })
export class InvoiceProductLookupService {
  private readonly productsApiService = inject(ProductsApiService);

  getLookupByProductIds(productIds: string[]): Observable<InvoiceProductLookup> {
    const uniqueProductIds = [...new Set(productIds.map((id) => id.trim()).filter(Boolean))];

    if (uniqueProductIds.length === 0) {
      return of({ namesById: {}, codesById: {} });
    }

    const defaultLookup = this.createDefaultLookup(uniqueProductIds);

    return this.productsApiService.getByIds(uniqueProductIds).pipe(
      map((products) => {
        const namesById = { ...defaultLookup.namesById };
        const codesById = { ...defaultLookup.codesById };

        products.forEach((product) => {
          namesById[product.id] = product.name;
          codesById[product.id] = product.code;
        });

        return { namesById, codesById };
      }),
      catchError(() => of(defaultLookup))
    );
  }

  private createDefaultLookup(productIds: string[]): InvoiceProductLookup {
    const namesById = productIds.reduce<Record<string, string>>((accumulator, productId) => {
      accumulator[productId] = productId;
      return accumulator;
    }, {});

    const codesById = productIds.reduce<Record<string, string>>((accumulator, productId) => {
      accumulator[productId] = '-';
      return accumulator;
    }, {});

    return { namesById, codesById };
  }
}