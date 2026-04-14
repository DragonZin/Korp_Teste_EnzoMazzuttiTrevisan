import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-invoices-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="card border-0 shadow-sm">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h2 class="h5 mb-1">Notas fiscais</h2>
            <p class="text-body-secondary mb-0">Listagem de notas.</p>
          </div>
        </div>

        <ul class="list-group list-group-flush">
          <li class="list-group-item d-flex justify-content-between align-items-center px-0">
            <div>
              <strong>NF-1001</strong>
              <p class="mb-0 text-body-secondary">Cliente ACME • 12/04/2026</p>
            </div>
            <a class="btn btn-outline-primary btn-sm" routerLink="/invoices/1001">Detalhar</a>
          </li>
          <li class="list-group-item d-flex justify-content-between align-items-center px-0">
            <div>
              <strong>NF-1002</strong>
              <p class="mb-0 text-body-secondary">Cliente Globex • 13/04/2026</p>
            </div>
            <a class="btn btn-outline-primary btn-sm" routerLink="/invoices/1002">Detalhar</a>
          </li>
        </ul>
      </div>
    </section>
  `
})
export class InvoicesPageComponent {}