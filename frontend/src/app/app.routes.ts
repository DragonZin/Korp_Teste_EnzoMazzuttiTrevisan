import { Routes } from '@angular/router';

import { HomePageComponent } from './features/home/pages/home-page.component';
import { InvoiceDetailPageComponent } from './features/invoices/pages/invoice-detail-page.component';
import { InvoicesPageComponent } from './features/invoices/pages/invoices-page.component';
import { ProductsPageComponent } from './features/products/pages/products-page.component';

export const routes: Routes = [
  {
    path: '',
    component: HomePageComponent
  },
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
    path: '**',
    redirectTo: ''
  }
];