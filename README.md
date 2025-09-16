

# 💸 Controle Financeiro

<div align="center">
   <a href="https://financeiro-seven-zeta.vercel.app" target="_blank"><img src="https://img.shields.io/badge/ACESSAR%20DEMO-00C7B7?style=for-the-badge&logo=vercel&logoColor=white" alt="Acessar Demo" /></a>
   <br />
   <b>Teste agora mesmo:</b><br />
   <code>Usuário: <b>teste@email.com</b></code><br />
   <code>Senha: <b>teste1</b></code>
</div>

Aplicação web moderna e responsiva para controle de despesas, rendas e organização financeira pessoal.<br>
Desenvolvida com <b>Next.js 14</b>, <b>TypeScript</b>, <b>Tailwind CSS</b>, <b>Prisma</b> e arquitetura de componentes reutilizáveis.

---


## 🚀 Funcionalidades

- **Dashboard interativo** com gráficos dinâmicos (Recharts) e resumos financeiros
- **Gestão completa de despesas e rendas** (fixas e variáveis), com categorias, tags e carteiras
- **Importação de extratos bancários** (OFX) com sugestão automática de categorias/tags
- **Transferências entre carteiras** e controle multi-carteira
- **Filtros avançados** por período, carteira, categoria e tags
- **Edição e exclusão em massa** de dados do usuário
- **Interface moderna, responsiva e com modo escuro** (Dark Mode)
- **Autenticação segura** com NextAuth.js (Credentials e OAuth)
- **Notificações (toasts) integradas**
- **Validação robusta de dados** em todas as rotas de API usando [Zod](https://zod.dev/)
- **Lazy loading** e otimizações de performance (useMemo, useCallback, dynamic imports)
- **Imagens otimizadas** com next/image
- **Padrão de código garantido** com ESLint e Prettier
- **Exportação de relatórios** _(em breve)_


## 🛠️ Tecnologias & Arquitetura

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, Shadcn/ui
- **Backend:** Next.js API Routes (serverless functions)
- **Banco de Dados:** PostgreSQL + Prisma ORM
- **Gráficos:** Recharts
- **Autenticação:** NextAuth.js (Credentials + OAuth)
- **Validação:** Zod
- **Padrão de código:** ESLint, Prettier
- **Deploy:** Vercel (compatível)


## 📋 Pré-requisitos

- [Node.js 18+](https://nodejs.org/)
- [PostgreSQL](https://www.postgresql.org/)
- npm ou yarn


## 🏁 Como rodar o projeto

1. **Clone o repositório**
   ```bash
   git clone <url-do-repositorio>
   cd financeiro-1
   ```

2. **Instale as dependências**
   ```bash
   npm install
   # ou yarn
   ```

3. **Configure as variáveis de ambiente**
   - Copie o arquivo `.env.example` para `.env.local` e preencha os dados:
   ```bash
   cp env.example .env.local
   ```
   - Configure:
     - `DATABASE_URL` (PostgreSQL)
     - `NEXTAUTH_SECRET` (chave aleatória)
     - `NEXTAUTH_URL` (ex: http://localhost:3000)
     - (Opcional) Google OAuth

4. **Configure o banco de dados**
   ```bash
   npm run db:generate   # Gera o client Prisma
   npm run db:push       # Aplica o schema no banco
   npm run db:studio     # (opcional) Abre o Prisma Studio
   ```

5. **Inicie o servidor de desenvolvimento**
   ```bash
   npm run dev
   ```
   Acesse: [http://localhost:3000](http://localhost:3000)

---


## � Estrutura do Projeto

```
financeiro/
├── src/
│   ├── app/            # Páginas, rotas e API (Next.js App Router)
│   ├── components/     # Componentes React (UI, dashboard, forms, etc)
│   ├── hooks/          # React hooks customizados
```md
# 💸 Financeiro — Controle financeiro pessoal

[Demo (Vercel)](https://financeiro-seven-zeta.vercel.app) • Usuário: `teste@email.com` • Senha: `teste1`

Aplicação web moderna para controlar despesas, rendas, transferências e organização por carteiras, categorias e tags.

Stack principal: Next.js 14, TypeScript, Tailwind CSS, Prisma (PostgreSQL), NextAuth, Recharts.

## Índice
- Sobre
- Principais recursos
- Tecnologias
- Requisitos
- Instalação rápida
- Variáveis de ambiente
- Banco de dados (Prisma)
- Scripts úteis
- Deploy
- Estrutura do projeto
- Contribuição
- Licença

## Sobre

Esta é uma interface para gerenciamento financeiro pessoal com painéis e gráficos interativos, importação de extratos e filtragem por período/carteira/categoria/tags.

## Principais recursos
- Dashboard com gráficos e projeções
- Registro de despesas e rendas (fixas/variáveis)
- Tags, categorias e carteiras
- Importador de extratos (OFX/CSV)
- Transferências entre carteiras
- Autenticação com NextAuth
- Validação com Zod

## Tecnologias
- Next.js 14 + App Router
- TypeScript
- Tailwind CSS
- Prisma (PostgreSQL)
- Recharts (gráficos)
- NextAuth (autenticação)

## Requisitos
- Node.js 18+
- PostgreSQL (ou conexão compatível)
- npm ou yarn

## Instalação rápida

1. Clone o repositório

   git clone <url-do-repositorio>
   cd financeiro

2. Instale dependências

   npm install
   # ou
   yarn

3. Crie o arquivo de ambiente

   # Unix / WSL
   cp env.example .env.local

   # Windows PowerShell
   Copy-Item .\env.example .\env.local

   Preencha as variáveis no `.env.local` (veja seção abaixo).

4. Prepare o banco de dados (Prisma)

   npm run db:generate   # gera @prisma/client
   npm run db:push       # aplica o schema (sem migrações)
   npm run db:studio     # (opcional) abre o Prisma Studio

5. Execute em modo de desenvolvimento

   npm run dev

Abra http://localhost:3000

## Variáveis de ambiente

Copie `env.example` e preencha, os principais valores esperados são:
- DATABASE_URL — string de conexão PostgreSQL
- NEXTAUTH_SECRET — segredo para NextAuth
- NEXTAUTH_URL — URL base (ex: http://localhost:3000)

Outras variáveis podem estar presentes para provedores OAuth e integrações.

## Scripts úteis (package.json)

- npm run dev — modo desenvolvimento
- npm run build — build de produção
- npm run start — inicia o servidor de produção (após build)
- npm run lint — executa ESLint
- npm run db:generate — prisma generate
- npm run db:push — prisma db push
- npm run db:studio — prisma studio
- npm run vercel-build — comando usado no build da Vercel

## Deploy

Recomendado: Vercel. Conecte o repositório e defina as variáveis de ambiente (DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL).

Observação: o script `vercel-build` já executa `prisma generate` antes do build.

## Estrutura (resumida)

src/
├─ app/           # páginas e rotas (App Router)
├─ components/    # componentes React reutilizáveis
├─ hooks/         # hooks customizados
├─ lib/           # utilitários e helpers
└─ types/         # tipos TypeScript

prisma/           # schema.prisma
public/           # assets estáticos

## Boas práticas e sugestões
- Use um banco PostgreSQL separado para desenvolvimento/testing
- Proteja `NEXTAUTH_SECRET` e credenciais no CI/hosting
- Para mudanças no schema, prefira usar migrações (prisma migrate) em vez de `db:push` para produção

## Contribuição

Pull requests são bem-vindos. Prefira pequenos PRs com descrições claras e, quando possível, inclua testes.

## Licença

MIT — veja o arquivo LICENSE (se presente).

---

Feito por João Carlos

## Relatórios (nova funcionalidade)

Uma tela dedicada de relatórios está disponível em `/reports`. Ela permite filtrar, visualizar e exportar lançamentos (rendas e despesas).

Principais controles e comportamento:
- Tipo: `Ambos` / `Rendas` / `Despesas`.
- Período: campos `Início` e `Fim` (pré-selecionados — início: primeiro dia do mês atual; fim: data atual). É necessário clicar em `Atualizar` para carregar a pré-visualização.
- Tag: filtro por tag (texto exato).
- Categorias: multi-select (pode selecionar várias categorias).
- Carteiras: multi-select (pode selecionar várias carteiras).
- Paginação: controle de página e seleção de `linhas por página` (10/25/50/100). Alterar o tamanho da página não dispara o carregamento — é preciso clicar em `Atualizar`.

Exportação:
- `Exportar CSV`: gera um CSV cliente-side baseado na pré-visualização atual.
- `Exportar XLSX`: solicita o endpoint server-side `GET /api/reports/export` que gera o arquivo Excel (`.xlsx`) formatado (coluna de data em `dd/mm/yyyy` e valores em real `R$`). A exportação não depende de a tabela estar previamente carregada — o servidor aplica os filtros recebidos e gera o arquivo completo.

Notas para desenvolvedores:
- Endpoint de listagem: `src/app/api/reports/route.ts` — retorna resultados paginados e totais (incomes, expenses, net). Está protegido por sessão (NextAuth) e filtra por `userId`.
- Endpoint de export: `src/app/api/reports/export/route.ts` — gera o arquivo com `exceljs` e faz streaming via `PassThrough` para reduzir uso de memória em arquivos grandes.
- Testes unitários básicos foram adicionados em `tests/api/*.test.ts` cobrindo autenticação e comportamento básico dos endpoints.
- Pontos futuros: migrar para `WorkbookWriter` do ExcelJS para cenários extremamente grandes, rodar auditoria de acessibilidade (axe) e adicionar testes E2E.

```
