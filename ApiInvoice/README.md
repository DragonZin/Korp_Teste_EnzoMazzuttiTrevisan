# API de Nota Fiscal (ApiInvoice)

Microserviço responsável pela criação, manutenção e fechamento de notas fiscais.

## Base URL

- Local (dotnet run): `http://localhost:5009`
- Docker Compose: **acesso externo somente via gateway** `http://localhost:8080`
- Via API Gateway: `http://localhost:8080`

> Observação: no gateway, use o prefixo direto da API: `/api/invoices`.

## Rotas

### Healthcheck
- `GET /api/invoices/health`

### Listar notas
- `GET /api/invoices?page=1&pageSize=10&status=`
- `status` é opcional
- `status`: `1` (Open), `2` (Closed)
- `page` mínimo efetivo: 1
- `pageSize` máximo efetivo: 100

Resposta paginada:
```json
{
  "items": [],
  "page": 1,
  "pageSize": 10,
  "totalItems": 0,
  "totalPages": 0
}
```

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

## Idempotência

- Header: `Idempotency-Key`
- Aplicado em:
  - `POST /api/invoices`
  - `PUT /api/invoices/{id}/close`
  - operações internas de ajuste de reserva/estoque disparadas durante `PATCH /items`, `DELETE item` e `DELETE invoice`
- Quando enviado, requisições repetidas com mesma chave e endpoint retornam a mesma resposta já persistida.
- A janela de idempotência é configurável por `SharedApi:IdempotencyRetentionWindow` (padrão sugerido: `72:00:00` na ApiInvoice).
- Após o fim da janela, a mesma chave deixa de ser reaproveitada e a operação volta a ser processada normalmente.
- A limpeza dos registros expirados roda em background com `SharedApi:IdempotencyCleanupInterval` e `SharedApi:IdempotencyCleanupBatchSize`.

### Métricas de idempotência

- `idempotency.table.size` (gauge): quantidade de registros atuais na tabela de idempotência.
- `idempotency.

## Regras relevantes

- Número da nota é sequencial e inicia em `1000`.
- Notas fechadas não podem ser alteradas (dados, itens ou exclusão).
- No fechamento, status muda para `Closed` e `ClosedAt` é preenchido.
- Inclusão de itens consulta a API de Produtos em lote (`POST /api/products/batch`).
- `ProductId` duplicado no mesmo PATCH é inválido.
- `Quantity` não pode ser negativa.
- Cada alteração de itens ajusta **reserva de estoque** (`reservedStock`) na ApiProduct.
- O fechamento da nota aplica baixa de estoque físico (`stock`) e baixa de reserva (`reservedStock`) para os itens da nota.
- A exclusão de nota aberta libera as reservas existentes antes de remover a nota.
- As chamadas HTTP para a ApiProduct usam resiliência com Polly: retry curto, timeout e circuit breaker.

## Fluxo de estoque/reserva

1. **PATCH /items**:
   - valida a nota e os produtos;
   - calcula delta por item (novo - anterior);
   - aplica ajuste de `reservedStock` na ApiProduct;
   - persiste itens e total da nota;
   - em falha parcial, executa compensação reversa dos deltas já aplicados.

2. **DELETE item**:
   - remove o item da nota;
   - libera a reserva correspondente (`reservedStockDelta` negativo);
   - em falha parcial, executa compensação.

3. **PUT /close**:
   - valida consistência de reserva e estoque para os itens da nota;
   - aplica ajuste combinado (`stockDelta` e `reservedStockDelta`) na ApiProduct;
   - em falha parcial, executa compensação síncrona;
   - marca nota como `Closed` e preenche `ClosedAt`.

4. **DELETE /{id}**:
   - disponível apenas para nota aberta;
   - libera reservas dos itens;
   - remove a nota;
   - em falha parcial, executa compensação.

## Padrão de erro

A API retorna erros no formato `application/problem+json`.

Exemplo:
```json
{
  "type": "https://httpstatuses.com/404",
  "title": "Recurso não encontrado",
  "status": 404,
  "detail": "Nota fiscal não encontrada.",
  "instance": "/api/invoices/00000000-0000-0000-0000-000000000000",
  "traceId": "0HNA8...",
  "timestamp": "2026-04-14T12:00:00Z"
}
```

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