# API de Nota Fiscal (ApiInvoice)

Microserviço responsável pela criação, manutenção e fechamento de notas fiscais.

## Base URL

- Local (dotnet run): `http://localhost:5009`
- Docker Compose: **acesso externo somente via gateway** `http://localhost:8080`
- Via API Gateway: `http://localhost:8080`

> Observação: no gateway, use o prefixo direto da API: `/api/invoices`.

## Rotas

### Healthcheck
- `GET /health`

### Listar notas
- `GET /api/invoices?page=1&pageSize=10&status=`
- `status` é opcional
- `status`: `1` (Open), `2` (Closed)

### Buscar nota por ID
- `GET /api/invoices/{id}`

### Criar nota
- `POST /api/invoices`

Body:
```json
{
  "customerName": "Maria Souza",
  "customerDocument": "12345678900"
}
```

### Atualizar dados da nota (somente aberta)
- `PUT /api/invoices/{id}`

Body (envie ao menos 1 campo):
```json
{
  "customerName": "Maria Souza da Silva"
}
```

### Adicionar/atualizar itens da nota (upsert)
- `PATCH /api/invoices/{id}/items`

Body:
```json
{
  "products": [
    {
      "productId": "8a95e9f9-7f4b-4d10-b72e-9aa8070abcc9",
      "quantity": 2
    }
  ]
}
```

### Remover item da nota
- `DELETE /api/invoices/{invoiceId}/product/{productId}`

### Fechar nota
- `PUT /api/invoices/{id}/close`

### Excluir nota (somente aberta)
- `DELETE /api/invoices/{id}`

### Idempotência (opcional)
- Header: `Idempotency-Key`
- Aplicado em:
  - `POST /api/invoices`
  - `PUT /api/invoices/{id}/close`
- Quando enviado, requisições repetidas com mesma chave e endpoint retornam a mesma resposta já persistida.

## Regras relevantes

- Número da nota é sequencial e inicia em `1000`.
- Notas fechadas não podem ser alteradas (dados, itens ou exclusão).
- No fechamento, status muda para `Closed` e `ClosedAt` é preenchido.
- Inclusão de itens consulta a API de Produtos em lote (`POST /api/products/batch`).
- `ProductId` duplicado no mesmo PATCH é inválido.
- `Quantity` não pode ser negativa.

## Executar localmente (sem Docker)

1. Suba bancos e API de produtos:
   ```bash
   docker compose up -d postgres-produtos postgres-nota_fiscal
   dotnet run --project ApiProduct
   ```
2. Rode a API de nota fiscal:
   ```bash
   dotnet run --project ApiInvoice
   ```

## Variáveis/configuração

- `ConnectionStrings__DefaultConnection`
  - Exemplo local: `Host=localhost;Port=5434;Database=nota_fiscal;Username=nota_fiscal;Password=nota_fiscal`
- `ProductApi__BaseUrl`
  - Exemplo local: `http://localhost:5242/`