# Korp Teste - APIs de Produtos e Nota Fiscal

Projeto .NET com duas APIs REST:

- **ApiProduct**: cadastro e consulta de produtos.
- **ApiInvoice**: emissão e gestão de notas fiscais, integrada à API de produtos.

Também inclui um **API Gateway (NGINX)** para centralizar o acesso.

## Estrutura

- `ApiProduct/` → microserviço de produtos.
- `ApiInvoice/` → microserviço de notas fiscais.
- `Gateway/nginx.conf` → roteamento do gateway.
- `docker-compose.yml` → orquestra bancos, APIs e gateway.

## Pré-requisitos

- Docker + Docker Compose
- (Opcional para rodar sem Docker) .NET SDK 10

## Subir tudo com Docker Compose

```bash
docker compose up --build -d
```

Serviços publicados:

- Gateway: `http://localhost:8080`
- API Produtos e API Nota Fiscal: **acesso externo somente via gateway**.
- PostgreSQL Produtos: `localhost:5433`
- PostgreSQL Nota Fiscal: `localhost:5434`

## URLs via API Gateway

- Gateway
  - `http://localhost:8080/health`
- Produtos
  - `http://localhost:8080/api/products/health`
- Nota Fiscal
  - `http://localhost:8080/api/invoices/health`

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
- A API de nota fiscal depende da API de produtos para carregar dados de produto durante inclusão de itens.
- Para detalhes de payloads e regras de negócio, veja:
  - `ApiProduct/README.md`
  - `ApiInvoice/README.md`