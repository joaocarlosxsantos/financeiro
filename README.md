# 💸 Sistema de Controle Financeiro

<div align="center">
   <a href="https://financeiro-seven-zeta.vercel.app" target="_blank">
      <img src="https://img.shields.io/badge/DEMO_ONLINE-00C7B7?style=for-the-badge&logo=vercel&logoColor=white" alt="Demo Online" />
   </a>
   <br /><br />
   <strong>🎯 Teste agora:</strong><br />
   <code>Usuário: <strong>teste@email.com</strong></code><br />
   <code>Senha: <strong>teste1</strong></code>
</div>

Sistema completo de controle financeiro pessoal com **inteligência artificial integrada** para categorização automática de transações. Desenvolvido com tecnologias modernas para oferecer uma experiência eficiente e intuitiva.

---

## ✨ Principais Recursos

### 🤖 **Inteligência Artificial Integrada**
- **Categorização automática** de transações com base na descrição
- **Sugestão inteligente de tags** relacionadas ao contexto
- **Pré-seleção automática** de categorias e tags em formulários
- **Algoritmo de correspondência inteligente** com normalização de texto

### 📊 **Dashboard & Relatórios**
- Dashboard interativo com gráficos dinâmicos (Recharts)
- Resumos financeiros em tempo real
- Relatórios detalhados com filtros avançados
- Exportação de dados em CSV e XLSX

### 💰 **Gestão Financeira Completa**
- Controle de **gastos e ganhos** (fixos e variáveis)  
- Sistema de **carteiras múltiplas** com transferências
- **Categorias personalizadas** com tipos flexíveis
- **Tags organizacionais** para melhor controle

### 📋 **Importação & Automação**
- **Importação automática de extratos** (OFX/CSV)
- **Sugestões de IA** durante a importação
- Processamento inteligente de descrições
- Detecção automática de padrões financeiros

### 🎨 **Interface Moderna**
- Design responsivo com **modo escuro/claro**
- Componentes reutilizáveis com Shadcn/ui
- **Notificações em tempo real** integradas
- Experiência otimizada para mobile

---

## 🛠️ Stack Tecnológica

### **Frontend**
- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** + Shadcn/ui
- **Recharts** para visualizações
- React Hooks customizados

### **Backend**
- **Next.js API Routes** (Serverless)
- **PostgreSQL** + Prisma ORM
- **NextAuth.js** (Autenticação)
- **Zod** (Validação de dados)

### **Qualidade & Performance**
- ESLint + Prettier (Padrão de código)
- Lazy loading e otimizações React
- Caching inteligente
- Imagens otimizadas

---

## � Instalação Rápida

### **Pré-requisitos**
- Node.js 18+ 
- PostgreSQL
- npm/yarn

### **Setup do Projeto**

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>
cd financeiro

# 2. Instale as dependências
npm install

# 3. Configure o ambiente
cp env.example .env.local

# 4. Configure o banco de dados
npm run db:generate
npm run db:push

# 5. Inicie o servidor
npm run dev
```

### **Variáveis de Ambiente Essenciais**

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/financeiro"
NEXTAUTH_SECRET="sua-chave-secreta-super-segura"
NEXTAUTH_URL="http://localhost:3000"
```

---

## 📁 Estrutura do Projeto

```
src/
├── app/                 # Rotas e API (App Router)
│   ├── api/            # Endpoints da API
│   ├── dashboard/      # Painel principal
│   ├── despesas/       # Gestão de gastos
│   ├── rendas/         # Gestão de ganhos
│   └── importar-extrato/ # IA para importação
├── components/         # Componentes React
│   ├── ui/            # Componentes base (Shadcn)
│   ├── dashboard/     # Componentes do dashboard
│   └── forms/         # Formulários inteligentes
├── lib/               # Utilitários e helpers
│   ├── ai-categorization.ts  # IA para categorização
│   └── auth.ts        # Configuração de autenticação
├── hooks/             # React Hooks customizados
└── types/             # Definições TypeScript
```

---

## 🤖 Sistema de IA

### **Como Funciona**
O sistema de IA analisa as descrições das transações e sugere automaticamente:

- **Categoria mais apropriada** baseada no contexto
- **Tags relacionadas** ao tipo de gasto/ganho
- **Normalização inteligente** removendo informações irrelevantes

### **Algoritmo de Categorização**
```typescript
// Exemplo de uso da IA
import { analyzeFormDescription } from '@/lib/ai-categorization';

const suggestions = await analyzeFormDescription({
  description: "Supermercado Extra SP",
  type: "expense"
});

// Resultado:
// {
//   suggestedCategory: "Alimentação",
//   suggestedTags: ["Supermercado"],
//   confidence: 0.95
// }
```

---

## 🔧 Scripts Disponíveis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build para produção
npm run start        # Servidor de produção
npm run lint         # Verificação de código
npm run db:generate  # Gerar cliente Prisma
npm run db:push      # Aplicar schema no banco
npm run db:studio    # Interface visual do banco
npm test             # Executar testes
```

---

## 🌟 Deploy

### **Vercel (Recomendado)**
1. Conecte seu repositório à Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

### **Outras Plataformas**
O projeto é compatível com qualquer plataforma que suporte Next.js.

---

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

## 👨‍💻 Autor

**João Carlos**

<div align="center">
   <br />
   <strong>💡 Transformando controle financeiro com inteligência artificial</strong>
</div>
```md
# 💸 Financeiro — Controle financeiro pessoal

[Demo (Vercel)](https://financeiro-seven-zeta.vercel.app) • Usuário: `teste@email.com` • Senha: `teste1`

Aplicação web moderna para controlar gastos, ganhos, transferências e organização por carteiras, categorias e tags.

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
- Registro de gastos e ganhos (fixos/variáveis)
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

- Uma tela dedicada de relatórios está disponível em `/reports`. Ela permite filtrar, visualizar e exportar lançamentos (ganhos e gastos).

Principais controles e comportamento:
- Tipo: `Ambos` / `Ganhos` / `Gastos`.
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

### API: Shortcuts balances

Endpoint para obter o saldo das carteiras do usuário.

- URL: `GET /api/shortcuts/balances`
- Autenticação: header `Authorization: Bearer <api-key>` ou sessão NextAuth.

Exemplo (curl):

```bash
curl "https://seu-dominio.com/api/shortcuts/balances" -H "Authorization: Bearer <API_KEY>"
```

Resposta JSON esperada (exemplo):

```json
[
   { "id": "ckw1...", "name": "Carteira", "type": "carteira", "balance": 150.5 },
   { "id": "ckw2...", "name": "Banco", "type": "banco", "balance": 1020.0 }
]
```

### API: Shortcuts attributes

Endpoint usado pelo app Shortcuts para obter listas reduzidas de categorias, tags e wallets (apenas `id` e `name`).

- URL: `GET /api/shortcuts/attributes`
- Autenticação: header `Authorization: Bearer <api-key>` ou sessão NextAuth.

Query parameters:
- `type=gasto` — retorna apenas categorias com tipo `EXPENSE` ou `BOTH`.
- `type=ganho` — retorna apenas categorias com tipo `INCOME` ou `BOTH`.
- sem parâmetro — retorna todas as categorias do usuário.

Placeholders:
- Categoria sem vínculo: `{ id: 'no-category', name: 'Sem categoria' }` (sempre o primeiro item em `categories`).
- Tag sem vínculo: `{ id: 'no-tag', name: 'Sem tag' }` (sempre o primeiro item em `tags`).

Exemplos (curl):

```bash
# tudo
curl "https://seu-dominio.com/api/shortcuts/attributes" -H "Authorization: Bearer <API_KEY>"

# somente categorias de gasto
curl "https://seu-dominio.com/api/shortcuts/attributes?type=gasto" -H "Authorization: Bearer <API_KEY>"

# somente categorias de ganho
curl "https://seu-dominio.com/api/shortcuts/attributes?type=ganho" -H "Authorization: Bearer <API_KEY>"
```

Resposta JSON esperada (exemplo):

```json
{
   "categories": [
      { "id": "no-category", "name": "Sem categoria" },
      { "id": "ckx...", "name": "Alimentação" },
      { "id": "ckx...", "name": "Transporte" }
   ],
   "wallets": [
      { "id": "ckw...", "name": "Carteira" },
      { "id": "ckw...", "name": "Banco" }
   ],
   "tags": [
      { "id": "no-tag", "name": "Sem tag" },
      { "id": "ckt...", "name": "Supermercado" }
   ]
}
```


```
