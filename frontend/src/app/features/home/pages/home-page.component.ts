import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  template: `
    <section class="py-5">
      <div class="text-center mb-5">
        <h2 class="display-6 fw-semibold mb-3">Plataforma de Gestão Comercial</h2>
        <p class="lead text-body-secondary mx-auto" style="max-width: 860px;">
          Este projeto integra <strong>Produtos</strong> e <strong>Notas Fiscais</strong> em uma arquitetura de
          microserviços .NET, com acesso centralizado por API Gateway e interface web em Angular.
        </p>

        <div class="d-flex flex-wrap justify-content-center gap-3 mt-4">
          <a class="btn btn-primary btn-lg" routerLink="/products">Acessar Produtos</a>
          <a class="btn btn-outline-primary btn-lg" routerLink="/invoices">Acessar Notas Fiscais</a>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-12 col-lg-4">
          <article class="card h-100 shadow-sm border-0">
            <div class="card-body">
              <h3 class="h5 card-title">Visão geral</h3>
              <p class="card-text text-body-secondary mb-2">
                O sistema é composto por dois serviços principais:
              </p>
              <ul class="mb-0 text-body-secondary">
                <li><strong>ApiProduct</strong>: cadastro, consulta e estoque de produtos.</li>
                <li><strong>ApiInvoice</strong>: emissão e gestão de notas fiscais.</li>
              </ul>
            </div>
          </article>
        </div>

        <div class="col-12 col-lg-4">
          <article class="card h-100 shadow-sm border-0">
            <div class="card-body">
              <h3 class="h5 card-title">Acesso rápido (Gateway)</h3>
              <ul class="small mb-0 text-body-secondary">
                <li>Frontend: <code>http://localhost:8080/</code></li>
                <li>Health geral: <code>http://localhost:8080/health</code></li>
                <li>Health produtos: <code>/api/products/health</code></li>
                <li>Health notas: <code>/api/invoices/health</code></li>
              </ul>
            </div>
          </article>
        </div>

        <div class="col-12 col-lg-4">
          <article class="card h-100 shadow-sm border-0">
            <div class="card-body">
              <h3 class="h5 card-title">Recursos importantes</h3>
              <ul class="mb-0 text-body-secondary">
                <li>Suporte a idempotência em operações críticas.</li>
                <li>Paginação padronizada nas listagens.</li>
                <li>Tratamento de erro em formato <code>problem+json</code>.</li>
                <li>Healthcheck com resposta degradada sem banco.</li>
              </ul>
            </div>
          </article>
        </div>
      </div>
    </section>
  `
})
export class HomePageComponent {}