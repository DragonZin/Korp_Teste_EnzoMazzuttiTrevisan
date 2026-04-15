# Frontend (Angular)

Interface web para gestão comercial, integrada às APIs de Produtos e Notas Fiscais via API Gateway.

## Tecnologias

- Angular 21
- TypeScript
- Bootstrap (estilos/layout)
- HttpClient + interceptor para `Idempotency-Key`

## Funcionalidades relevantes

- **Dashboard inicial** com atalhos para módulos de produtos e notas.
- **Monitor de saúde** no cabeçalho com status agregado:
  - API Produtos
  - Banco Produtos
  - API Notas
  - Banco Notas
- **Módulo de produtos**:
  - listagem paginada;
  - busca e recarregamento;
  - criação/edição em modal;
  - exclusão;
  - KPIs da página (total, estoque e disponível);
  - badge visual de disponibilidade.
- **Módulo de notas**:
  - listagem paginada com filtro por status;
  - criação, exclusão e fechamento de nota;
  - navegação para detalhe e impressão.
- **Detalhe da nota**:
  - edição de dados do cliente (nome/documento);
  - gestão de itens (adicionar, ajustar quantidade, remover);
  - catálogo paginado para inclusão de produtos.
- **Tela de impressão**:
  - versão otimizada para impressão da nota;
  - ação de imprimir e fechamento direto da nota.
- **Tratamento de erro amigável** para respostas `problem+json`.

## Endereços e integração

Em ambiente Docker Compose, o acesso principal é pelo gateway:

- Frontend: `http://localhost:8080/`
- Produtos: `http://localhost:8080/api/products`
- Notas: `http://localhost:8080/api/invoices`

Em desenvolvimento local com Angular CLI:

- Frontend: `http://localhost:4200/`

## Rodando em desenvolvimento

No diretório `frontend/`:

```bash
npm install
npm run start
```

Depois, abra `http://localhost:4200/`.

> Se necessário, ajuste o alvo de API em `src/app/core/api/api.config.ts` e/ou use proxy local (`proxy.conf.json`).

## Build

```bash
npm run build
```

## Testes

```bash
npm run test
```

## Observações

- O frontend envia `Idempotency-Key` automaticamente quando a chamada usa o contexto apropriado.
- Para comportamento completo de estoque/reserva, execute junto com `ApiProduct` e `ApiInvoice`.
