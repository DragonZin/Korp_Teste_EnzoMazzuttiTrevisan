import { Component } from '@angular/core';

@Component({
  selector: 'app-products-page',
  standalone: true,
  template: `
    <section class="card border-0 shadow-sm">
      <div class="card-body">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h2 class="h5 mb-1">Produtos</h2>
            <p class="text-body-secondary mb-0">Listagem e manutenção de produtos.</p>
          </div>
          <button type="button" class="btn btn-primary">Novo produto</button>
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
              <tr>
                <td>PRD-001</td>
                <td>Cadeira ergonômica</td>
                <td class="text-end">R$ 799,00</td>
                <td class="text-end">
                  <button type="button" class="btn btn-sm btn-outline-secondary">Editar</button>
                </td>
              </tr>
              <tr>
                <td>PRD-002</td>
                <td>Monitor 27"</td>
                <td class="text-end">R$ 1.699,00</td>
                <td class="text-end">
                  <button type="button" class="btn btn-sm btn-outline-secondary">Editar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `
})
export class ProductsPageComponent {}