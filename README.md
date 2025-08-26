# Controle Financeiro

Uma aplicação web completa para controle de despesas e rendas pessoais, desenvolvida com Next.js, TypeScript, Tailwind CSS e Prisma.

## 🚀 Funcionalidades

- **Dashboard** com gráficos e resumos financeiros
- **Gestão de despesas** (fixas e variáveis) e **rendas** (fixas e variáveis), com categorias e tags
- **Importação de extrato bancário** (OFX/CSV), com sugestão automática de categorias e criação de categorias/tags durante a importação
- **Sistema de carteiras** (wallets) e transferências entre carteiras
- **Filtros por período e por carteira**
- **Edição e exclusão em massa de dados do usuário**
- **Interface moderna e responsiva**, com modo escuro
- **Autenticação com NextAuth.js**
- **Notificações (toasts)**
- **Sistema de tags** para despesas/rendas
- **Exportação de relatórios** (em desenvolvimento)
- **Validação de dados com Zod** (em desenvolvimento)

## 🛠️ Tecnologias

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Shadcn/ui
- **Backend**: Next.js API Routes (serverless functions)
- **Banco de Dados**: PostgreSQL com Prisma ORM
- **Gráficos**: Recharts
- **Deploy**: Vercel (compatível)

## 📋 Pré-requisitos

- Node.js 18+
- PostgreSQL
- npm ou yarn

## 🔧 Instalação

1. **Clone o repositório**

```bash
git clone <url-do-repositorio>
cd financeiro
```

2. **Instale as dependências**

```bash
npm install
```

3. **Configure as variáveis de ambiente**
   Crie um arquivo `.env.local` na raiz do projeto:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/financeiro"
NEXTAUTH_SECRET="sua-chave-secreta-aqui"
NEXTAUTH_URL="http://localhost:3000"
```

4. **Configure o banco de dados**

```bash
# Gere o cliente Prisma
npm run db:generate

# Execute as migrações
npm run db:push
```

5. **Inicie o servidor de desenvolvimento**

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`

## 📁 Estrutura do Projeto

```
financeiro/
├── src/
│   ├── app/                    # Páginas da aplicação
│   │   ├── dashboard/          # Dashboard principal
│   │   ├── despesas/           # Gerenciamento de despesas
│   │   ├── rendas/             # Gerenciamento de rendas
│   │   ├── categorias/         # Gerenciamento de categorias
│   │   └── api/                # API Routes
│   ├── components/             # Componentes React
│   │   ├── ui/                 # Componentes base (shadcn/ui)
│   │   ├── dashboard/          # Componentes do dashboard
│   │   ├── despesas/           # Componentes de despesas
│   │   ├── rendas/             # Componentes de rendas
│   │   ├── categorias/         # Componentes de categorias
│   │   └── layout/             # Componentes de layout
│   ├── lib/                    # Utilitários e configurações
│   └── types/                  # Tipos TypeScript
├── prisma/                     # Schema e migrações do banco
└── public/                     # Arquivos estáticos
```

## 🗄️ Banco de Dados

O projeto utiliza PostgreSQL com Prisma ORM. As principais tabelas são:

- **User**: Usuários do sistema
- **Category**: Categorias de despesas/rendas
- **Expense**: Despesas (fixas e variáveis)
- **Income**: Rendas (fixas e variáveis)

## 🚀 Deploy no Vercel

1. **Conecte seu repositório ao Vercel**
2. **Configure as variáveis de ambiente**:
   - `DATABASE_URL`: URL do seu banco PostgreSQL
   - `NEXTAUTH_SECRET`: Chave secreta para autenticação
   - `NEXTAUTH_URL`: URL da sua aplicação

3. **Deploy automático** será feito a cada push para a branch principal

## 🔄 Próximos Passos

- [ ] Adicionar testes automatizados
- [ ] Finalizar exportação de relatórios
- [ ] Finalizar validação de dados com Zod

## 📝 Licença

Este projeto está sob a licença MIT.

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor, abra uma issue ou pull request.
