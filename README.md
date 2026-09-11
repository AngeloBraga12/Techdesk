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
- GitHub Actions para validação do build

## Stack atual

- React
- TypeScript
- Vite
- CSS
- localStorage
- GitHub Actions

## Arquitetura atual

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
```

A persistência local é intencional nesta etapa. O projeto não finge ter backend onde não existe backend, porque chamar `localStorage` de microserviço seria uma contribuição especialmente ruim para a indústria de software.

## Próximas evoluções

1. API REST com Node.js e TypeScript
2. PostgreSQL + Prisma
3. Autenticação e autorização por usuário
4. Histórico completo das ordens
5. Testes unitários e de integração
6. Upload de anexos e evidências técnicas
7. Relatórios operacionais
8. Deploy separado do ambiente de portfólio

## Objetivo de portfólio

O TechDesk demonstra evolução de um frontend funcional para uma arquitetura de produto, com domínio explícito, componentes reutilizáveis, persistência, formulários e fluxo CRUD. A próxima etapa é transformar a camada local em uma API real sem alterar o modelo de negócio da aplicação.

## Autor

Angelo Braga · Desenvolvedor Web / Front-end · Técnico em Informática

[GitHub](https://github.com/AngeloBraga12) · [LinkedIn](https://www.linkedin.com/in/angelo-braga-5747b4192)