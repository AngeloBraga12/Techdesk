# TechDesk: preparação para produção

Este documento descreve a configuração necessária para colocar o TechDesk em produção. A aplicação ainda não é publicada por este repositório automaticamente.

## Arquitetura preparada

- Frontend: build Vite (`dist/`), hospedado em um serviço de frontend/CDN.
- API: Node.js + Express, preparada para execução com `npm run server:prod` ou pela imagem Docker.
- Banco: PostgreSQL.
- Migrações: Prisma Migrate usando `npm run db:migrate:deploy`.
- Sessão: cookie HttpOnly, SameSite=Strict e Secure em produção.

O frontend e a API podem ser hospedados separadamente. Se forem colocados em sites diferentes, revisar a estratégia de cookie e CSRF antes da publicação, porque `SameSite=Strict` foi adotado como padrão seguro para uma implantação same-site.

## Variáveis obrigatórias

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
CORS_ORIGINS=https://app.exemplo.com
AUTH_ALLOW_REGISTRATION=false
PORT=3001
```

`DATABASE_URL` deve existir somente no ambiente de execução ou no gerenciador de secrets do provedor. Nunca deve ser commitada no Git.

`CORS_ORIGINS` deve conter somente as origens reais do frontend, separadas por vírgula. Não usar `*` com credenciais.

`AUTH_ALLOW_REGISTRATION` deve permanecer `false` depois da criação controlada da primeira conta administrativa.

## Banco de dados

O processo de produção deve aplicar as migrações versionadas com:

```bash
npm run db:migrate:deploy
```

Não usar `prisma migrate dev` em produção. O comando de produção é `migrate deploy`, que aplica somente as migrações pendentes.

Antes da primeira publicação:

1. Criar o PostgreSQL de produção.
2. Configurar `DATABASE_URL` no ambiente de produção.
3. Executar `prisma migrate deploy` como parte do release/deploy.
4. Confirmar `prisma migrate status`.
5. Fazer backup antes de alterações relevantes de banco.

## API

Build:

```bash
npm run db:generate
npm run build
```

Execução:

```bash
npm run server:prod
```

Health check público:

```text
GET /api/health
```

O health check deve retornar HTTP 200 somente quando a API estiver respondendo e o PostgreSQL estiver acessível.

## Segurança de produção

- HTTPS obrigatório no frontend e na API.
- Cookie de sessão `HttpOnly`, `Secure` e `SameSite=Strict`.
- Cadastro público desativado.
- CORS restrito ao frontend oficial.
- Payload JSON limitado a 1 MB.
- Headers de segurança habilitados.
- `X-Powered-By` desabilitado.
- Rate limiting aplicado por IP e identidade.
- Bootstrap do primeiro ADMIN protegido por transação e advisory lock.
- Senhas armazenadas com scrypt e salt aleatório.
- Apenas hash SHA-256 do token de sessão é persistido.
- Rotas destrutivas exigem papel ADMIN.

## Rate limiting em escala

O rate limiter atual é seguro para uma única instância, mas mantém estado em memória. Antes de operar múltiplas instâncias da API, migrar os buckets de autenticação para um armazenamento compartilhado, como Redis, ou usar um controle equivalente no gateway/proxy.

## Proxy reverso

Se o provedor ficar atrás de um proxy reverso, configurar corretamente a confiança de proxy antes de depender de `req.ip` para controles de segurança. Não habilitar confiança indiscriminada em qualquer proxy.

## CI/CD recomendado

O fluxo de publicação deve seguir esta ordem:

1. Push/merge em `main`.
2. CI de build, banco e CRUD.
3. Security Tests.
4. Deploy do frontend.
5. Aplicação das migrações PostgreSQL.
6. Deploy da API.
7. Health check.
8. Smoke test de login e API.
9. Registro do deploy.

O ambiente `production` do GitHub Actions deve conter os secrets de produção e, quando possível, exigir aprovação antes do job de produção.

## Checklist antes do primeiro deploy

- [ ] PostgreSQL de produção criado.
- [ ] Backup e restauração testados.
- [ ] `DATABASE_URL` configurada como secret.
- [ ] `CORS_ORIGINS` aponta somente para o frontend real.
- [ ] `NODE_ENV=production`.
- [ ] `AUTH_ALLOW_REGISTRATION=false` após bootstrap do ADMIN.
- [ ] HTTPS ativo.
- [ ] Health check configurado no provedor.
- [ ] CI verde.
- [ ] Security Tests verdes.
- [ ] Migrações aplicadas.
- [ ] Smoke test de autenticação executado.
- [ ] Rate limiting compartilhado planejado antes de escalar horizontalmente.
- [ ] Logs e alertas configurados.

## Observação

A preparação deste arquivo e da imagem Docker não publica o sistema. O deploy efetivo deve ser feito somente depois de escolher o provedor e configurar o banco e os secrets de produção.
