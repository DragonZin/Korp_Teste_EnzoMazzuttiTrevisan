# Korp Teste - APIs de Produtos e Nota Fiscal

Projeto .NET com duas APIs REST:

- **ApiProduct**: cadastro e consulta de produtos.
- **ApiInvoice**: emissão e gestão de notas fiscais, integrada à API de produtos.

Também inclui um **API Gateway (NGINX)** para centralizar o acesso e entregar o frontend na rota principal (`/`).

## Estrutura

- `ApiProduct/` → microserviço de produtos. (C# – ASP.NET Core Web API)
- `ApiInvoice/` → microserviço de notas fiscais. (C# – ASP.NET Core Web API)
- `BuildingBlocks/` → componentes compartilhados (middlewares, healthcheck, idempotência e tratamento de erro).
- `Gateway/nginx.conf` → roteamento do gateway.
- `frontend/` → aplicação frontend (Angular).
- `docker-compose.yml` → orquestra bancos, APIs e gateway.

## Pré-requisitos

- Docker + Docker Compose
- (Opcional para rodar sem Docker) .NET SDK 10 e Node.js 22+

## Subir tudo com Docker Compose

```bash
docker compose up --build -d
```

Serviços publicados:

- Frontend (via gateway): `http://localhost:8080/`
- API Produtos e API Nota Fiscal: **acesso externo somente via gateway**.
- PostgreSQL Produtos: `localhost:5433`
- PostgreSQL Nota Fiscal: `localhost:5434`

## URLs via API Gateway

- Gateway
  - `http://localhost:8080/health`
- Frontend
  - `http://localhost:8080/`
- Produtos
  - `http://localhost:8080/api/products/health`
- Nota Fiscal
  - `http://localhost:8080/api/invoices/health`

## Funcionalidades relevantes

- **Idempotência por header `Idempotency-Key`** para operações críticas.
- **Paginação padronizada** com `items`, `page`, `pageSize`, `totalItems` e `totalPages`.
- **Tratamento de erro padronizado (`application/problem+json`)** com `traceId` e `timestamp`.
- **Healthcheck com status degradado (`503`)** quando não há conexão com banco.
- **Migração automática de banco no startup** das APIs.
- **Resiliência HTTP na ApiInvoice para chamadas à ApiProduct** com Polly (`retry`, `timeout` e `circuit breaker`).
- **Reserva de estoque em notas abertas**: ao adicionar/editar itens da nota, a reserva é ajustada na ApiProduct (`reservedStock`).
- **Compensação síncrona em operações de estoque** (itens, fechamento e exclusão de nota), com reversão dos deltas já aplicados em caso de falha parcial.
- **Fluxo de fechamento com commit de estoque**: ao fechar a nota, há baixa do `stock` e liberação da reserva em uma única operação de ajuste.
- **Frontend Angular com gestão completa** de produtos e notas (listagem, filtros, paginação, edição, fechamento e tela de impressão).

## Rodar localmente sem Docker (APIs)

1. Suba apenas os bancos:
   ```bash
   docker compose up -d postgres-produtos postgres-nota_fiscal
   ```
2. Em um terminal, rode a API de produtos:
   ```bash
   dotnet run --project ApiProduct
   ```
3. Em outro terminal, rode a API de nota fiscal:
   ```bash
   dotnet run --project ApiInvoice
   ```

## Observações

- As APIs possuem endpoint `/health` para verificação básica de conectividade com banco.
- A API de nota fiscal depende da API de produtos para carregar catálogo, reservar estoque, liberar reserva e efetivar baixa no fechamento.
- Para detalhes de payloads e regras de negócio, veja:
  - `ApiProduct/README.md`
  - `ApiInvoice/README.md`
  - `frontend/README.md`