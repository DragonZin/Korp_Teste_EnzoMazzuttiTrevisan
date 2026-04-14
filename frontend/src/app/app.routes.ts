import { Routes } from '@angular/router';

import { InvoiceDetailPageComponent } from './features/invoices/pages/invoice-detail-page.component';
import { InvoicesPageComponent } from './features/invoices/pages/invoices-page.component';
import { ProductsPageComponent } from './features/products/pages/products-page.component';

export const routes: Routes = [
  {
    path: 'products',
    component: ProductsPageComponent
  },
  {
    path: 'invoices',
    component: InvoicesPageComponent
  },
  {
    path: 'invoices/:id',
    component: InvoiceDetailPageComponent
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'products'
  },
  {
    path: '**',
    redirectTo: 'products'
  }
];