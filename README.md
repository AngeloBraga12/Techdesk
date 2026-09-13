# TechDesk

TechDesk é uma aplicação web para gestão de assistência técnica, construída com React, TypeScript, Vite, Node.js, Express, PostgreSQL e Prisma.

## Objetivo

Centralizar clientes, equipamentos, ordens de serviço, diagnósticos, orçamentos, status e histórico em uma interface única.

## Stack

- React + TypeScript + Vite
- Node.js + Express
- PostgreSQL + Prisma
- CORS restritivo e sessões HTTP-only
- CI com auditoria de dependências, build, migrações e testes de API
- Suite dedicada de segurança para autenticação, autorização, ciclo de sessão, validação, CORS, injeção, headers e rate limiting

## Segurança

A API utiliza hash de senha com scrypt, sessões persistidas no PostgreSQL com tokens aleatórios armazenados apenas como hash, cookies HttpOnly/SameSite, expiração e invalidação de sessão, controle de papéis, rate limiting de login, validação de entrada, limite de payload, CORS por allowlist e tratamento centralizado de erros.

O projeto mantém os testes de segurança no CI para evitar regressões durante a evolução da aplicação.

## Desenvolvimento

```bash
npm install
npm run dev:all
```

Para o banco local:

```bash
docker compose up -d
npm run db:migrate
npm run db:generate
```

A documentação operacional do backend está em `server/README.md`.
