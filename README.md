
# 💸 Controle Financeiro

Aplicação web moderna e responsiva para controle de despesas, rendas e organização financeira pessoal.
Desenvolvida com **Next.js 14**, **TypeScript**, **Tailwind CSS**, **Prisma** e arquitetura de componentes reutilizáveis.

---


## 🚀 Funcionalidades

- **Dashboard interativo** com gráficos dinâmicos (Recharts) e resumos financeiros
- **Gestão completa de despesas e rendas** (fixas e variáveis), com categorias, tags e carteiras
- **Importação de extratos bancários** (OFX/CSV) com sugestão automática de categorias/tags
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
financeiro-1/
├── src/
│   ├── app/            # Páginas, rotas e API (Next.js App Router)
│   ├── components/     # Componentes React (UI, dashboard, forms, etc)
│   ├── hooks/          # React hooks customizados
│   ├── lib/            # Utilitários, autenticação, helpers
│   └── types/          # Tipos TypeScript globais
├── prisma/             # Schema e migrações do banco
├── public/             # Arquivos estáticos
├── scripts/            # Scripts utilitários
├── .prettierrc         # Configuração do Prettier
├── tailwind.config.js  # Configuração do Tailwind
└── ...
```


## 🗄️ Banco de Dados

O projeto utiliza **PostgreSQL** com **Prisma ORM**. Principais entidades:
- **User**: Usuários
- **Category**: Categorias de despesas/rendas
- **Expense**: Despesas (fixas/variáveis)
- **Income**: Rendas (fixas/variáveis)
- **Wallet**: Carteiras
- **Tag**: Tags para organização


## 🚀 Deploy

Deploy recomendado na [Vercel](https://vercel.com/):
1. Conecte o repositório
2. Configure as variáveis de ambiente (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`)
3. O deploy é automático a cada push na branch principal


## 🔄 Novidades & Próximos Passos

### Novidades recentes
- Validação de dados com **Zod** em todas as rotas de API (mais segurança)
- Otimização de performance: lazy loading, useMemo/useCallback, dynamic imports
- Imagens otimizadas com **next/image**
- ESLint e Prettier configurados para padronização de código
- Estrutura de autenticação robusta (NextAuth.js + Prisma)
- Interface aprimorada e responsiva

### Roadmap
- [ ] Testes automatizados (unitários e integração)
- [ ] Exportação de relatórios
- [ ] Novos provedores de autenticação (Google, etc)
- [ ] Melhorias de acessibilidade


## 📝 Licença

Distribuído sob a licença MIT.


## 🤝 Contribua!

Contribuições são super bem-vindas! Abra uma issue ou pull request para sugerir melhorias, reportar bugs ou propor novas funcionalidades.

---

<div align="center">
   <b>Feito com 💙 por João Carlos e colaboradores</b>
</div>
