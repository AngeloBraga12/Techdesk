# TechDesk

TechDesk é uma aplicação SaaS de gestão para assistências técnicas, criada como projeto de portfólio com foco em operação real de bancada.

A aplicação organiza clientes, equipamentos e ordens de serviço em um fluxo único, permitindo acompanhar problemas relatados, diagnóstico, orçamento e status do atendimento.

## O que já funciona

- Dashboard com indicadores operacionais
- Cadastro de clientes
- Cadastro de equipamentos vinculados a clientes
- Criação e edição de ordens de serviço
- Relacionamento entre cliente, equipamento e OS
- Busca e filtro por status
- Avanço de status da ordem
- Exclusão de ordens com confirmação
- Persistência local com `localStorage`
- Interface responsiva
- Componentes React separados por responsabilidade
- TypeScript para modelagem do domínio
- API REST inicial em Node.js + Express
- Endpoint de health check e endpoints CRUD iniciais
- GitHub Actions para validação do build

## Stack atual

- React
- TypeScript
- Vite
- Node.js
- Express
- CSS
- localStorage
- GitHub Actions

## Arquitetura

```text
src/
├── components/
│   ├── Customers.tsx
│   ├── Dashboard.tsx
│   ├── Equipment.tsx
│   ├── OrderForm.tsx
│   └── ServiceOrders.tsx
├── data/
│   └── mock.ts
├── utils/
│   └── storage.ts
├── App.tsx
├── styles.css
└── types.ts

server/
├── index.ts
└── README.md
```

A persistência local continua sendo usada pelo frontend nesta etapa. A API já existe como uma camada independente e atualmente mantém seus dados em memória. O projeto não apresenta armazenamento temporário como se fosse banco de produção.

## API local

```bash
npm install
npm run server
```

Servidor: `http://localhost:3001`

Endpoints atuais:

- `GET /api/health`
- `GET /api/customers`
- `GET /api/equipment`
- `GET /api/orders`
- `POST /api/customers`
- `POST /api/equipment`
- `POST /api/orders`

## Roadmap

- [x] Frontend operacional
- [x] Domínio tipado
- [x] CRUD local
- [x] API REST inicial
- [ ] Conectar frontend à API
- [ ] PostgreSQL + Prisma
- [ ] Validação centralizada
- [ ] Autenticação e autorização
- [ ] Histórico completo das ordens
- [ ] Testes unitários e de integração
- [ ] Upload de anexos e evidências técnicas
- [ ] Relatórios operacionais
- [ ] Deploy separado do ambiente de portfólio

## Objetivo de portfólio

O TechDesk demonstra evolução de um frontend funcional para uma arquitetura de produto, com domínio explícito, componentes reutilizáveis, persistência, formulários, fluxo CRUD e uma API REST inicial. As próximas etapas substituem a persistência temporária por infraestrutura real sem mudar o modelo de negócio da aplicação.

## Autor

Angelo Braga · Desenvolvedor Web / Front-end · Técnico em Informática

[GitHub](https://github.com/AngeloBraga12) · [LinkedIn](https://www.linkedin.com/in/angelo-braga-5747b4192)