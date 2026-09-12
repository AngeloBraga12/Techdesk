# TechDesk API

API REST inicial do TechDesk.

## Executar localmente

```bash
npm install
npm run server
```

A API fica disponível em `http://localhost:3001`.

## Endpoints atuais

- `GET /api/health`
- `GET /api/customers`
- `GET /api/equipment`
- `GET /api/orders`
- `POST /api/customers`
- `POST /api/equipment`
- `POST /api/orders`

Nesta etapa os dados ainda ficam em memória. O PostgreSQL e o Prisma entram na próxima evolução, evitando apresentar armazenamento temporário como se fosse banco de produção.