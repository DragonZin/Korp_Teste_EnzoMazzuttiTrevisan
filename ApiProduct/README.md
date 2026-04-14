# API de Produtos (ApiProduct)

Microserviço responsável pelo cadastro e consulta de produtos.

## Base URL

- Local (dotnet run): `http://localhost:5242`
- Docker Compose: **acesso externo somente via gateway** `http://localhost:8080`
- Via API Gateway: `http://localhost:8080`

> Observação: no gateway, use o prefixo direto da API: `/api/products`.

## Rotas

### Healthcheck
- `GET /health`

Resposta exemplo:
```json
{
  "status": "ok",
  "databaseOnline": true,
  "timestamp": "2026-04-14T12:00:00Z"
}
```

### Listar produtos
- `GET /api/products?search=&page=1&pageSize=10`
- `search` é opcional
- `page` mínimo: 1
- `pageSize` máximo efetivo: 100

### Buscar produto por ID
- `GET /api/products/{id}`

### Buscar produtos por lote de IDs
- `POST /api/products/batch`

Body:
```json
{
  "ids": [
    "8a95e9f9-7f4b-4d10-b72e-9aa8070abcc9",
    "24f7dffe-f6d2-4d42-b25f-157bc11277ce"
  ]
}
```

### Criar produto
- `POST /api/products`

Body:
```json
{
  "code": "SKU-001",
  "name": "Teclado Mecânico",
  "stock": 25,
  "price": 249.90
}
```

### Atualizar produto
- `PUT /api/products/{id}`

Body (envie ao menos 1 campo):
```json
{
  "name": "Teclado Mecânico RGB",
  "stock": 30
}
```

### Excluir produto (soft delete)
- `DELETE /api/products/{id}`

### Idempotência (opcional)
- Header: `Idempotency-Key`
- Aplicado em: `POST /api/products`
- Quando enviado, requisições repetidas com mesma chave e endpoint retornam a mesma resposta já persistida.

## Regras relevantes

- `Code` é obrigatório, único (entre produtos não excluídos) e com até 50 caracteres.
- `Name` é obrigatório e com até 255 caracteres.
- `Stock` e `Price` não podem ser negativos.
- Exclusão é lógica (`is_deleted = true`).

## Executar localmente (sem Docker)

1. Suba o banco PostgreSQL de produtos:
   ```bash
   docker compose up -d postgres-produtos
   ```
2. Rode a API:
   ```bash
   dotnet run --project ApiProduct
   ```

## Variáveis/configuração

- `ConnectionStrings__DefaultConnection`
  - Exemplo local: `Host=localhost;Port=5433;Database=produtos;Username=produtos;Password=produtos`