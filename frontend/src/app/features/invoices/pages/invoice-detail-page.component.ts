import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-invoice-detail-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="card border-0 shadow-sm">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start gap-3 mb-4">
          <div>
            <h2 class="h5 mb-1">Detalhe da nota #{{ invoiceId() }}</h2>
            <p class="text-body-secondary mb-0">Visualização e edição da nota fiscal.</p>
          </div>
          <a class="btn btn-outline-secondary btn-sm" routerLink="/invoices">Voltar</a>
        </div>

        <form class="row g-3">
          <div class="col-md-6">
            <label class="form-label" for="customer">Cliente</label>
            <input id="customer" class="form-control" value="Cliente exemplo" />
          </div>
          <div class="col-md-3">
            <label class="form-label" for="issueDate">Data de emissão</label>
            <input id="issueDate" type="date" class="form-control" value="2026-04-14" />
          </div>
          <div class="col-md-3">
            <label class="form-label" for="amount">Valor total</label>
            <input id="amount" class="form-control" value="R$ 2.498,00" />
          </div>

          <div class="col-12 d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-outline-secondary">Cancelar</button>
            <button type="button" class="btn btn-primary">Salvar alterações</button>
          </div>
        </form>
      </div>
    </section>
  `
})
export class InvoiceDetailPageComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly invoiceId = computed(() => this.route.snapshot.paramMap.get('id') ?? '');
}