# 🐳 Guia de Uso - Docker

Este guia explica como rodar o Sistema Financeiro usando Docker.

## 📋 Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado
- [Git](https://git-scm.com/) (para clonar o projeto)

## 🚀 Início Rápido

### 1. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo e configure as variáveis:

```powershell
Copy-Item .env.exemple .env
```

Edite o arquivo `.env` e **obrigatoriamente** altere:

```env
NEXTAUTH_SECRET=SUA_CHAVE_SECRETA_AQUI
```

Para gerar uma chave segura no PowerShell:

```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

### 2. Iniciar a Aplicação

```powershell
docker-compose up -d
```

Este comando irá:
- ✅ Criar o banco de dados PostgreSQL
- ✅ Buildar a imagem da aplicação
- ✅ Aplicar as migrações do Prisma
- ✅ Iniciar a aplicação na porta 3000

### 3. Acessar a Aplicação

Abra seu navegador em: **http://localhost:3000**

## 📍 Onde Configurar as Variáveis de Ambiente

### ⚠️ IMPORTANTE: Use o arquivo `.env` na raiz do projeto

**NÃO** edite o `docker-compose.yml` diretamente. Todas as configurações devem ser feitas no arquivo `.env`:

```
c:\Projects\financeiro\.env
```

### Variáveis Disponíveis

#### 🗄️ Banco de Dados
```env
POSTGRES_USER=financeiro          # Usuário do banco
POSTGRES_PASSWORD=financeiro123   # Senha do banco (ALTERE!)
POSTGRES_DB=financeiro            # Nome do banco
POSTGRES_PORT=5432                # Porta do PostgreSQL
```

#### 🔐 Autenticação (NextAuth)
```env
NEXTAUTH_SECRET=sua-chave-aqui    # OBRIGATÓRIO - Gere uma chave segura!
NEXTAUTH_URL=http://localhost:3000
```

#### 🔒 WebAuthn (Biometria)
```env
NEXT_PUBLIC_RP_ID=localhost
NEXT_PUBLIC_ORIGIN=http://localhost:3000
```

#### 🌐 Google OAuth (Opcional)
```env
GOOGLE_CLIENT_ID=seu-client-id
GOOGLE_CLIENT_SECRET=seu-secret
```

#### 🤖 OpenAI (Opcional - Assistente IA)
```env
OPENAI_API_KEY=sua-chave-openai
```

## 🛠️ Comandos Úteis

### Ver logs da aplicação
```powershell
docker-compose logs -f app
```

### Ver logs do banco de dados
```powershell
docker-compose logs -f postgres
```

### Parar a aplicação
```powershell
docker-compose down
```

### Parar e remover volumes (⚠️ apaga dados do banco)
```powershell
docker-compose down -v
```

### Rebuildar a imagem após mudanças no código
```powershell
docker-compose up -d --build
```

### Acessar o banco de dados
```powershell
docker-compose exec postgres psql -U financeiro -d financeiro
```

### Executar comandos Prisma
```powershell
# Gerar client
docker-compose exec app npx prisma generate

# Visualizar banco (Prisma Studio)
docker-compose exec app npx prisma studio
```

### Reiniciar apenas a aplicação
```powershell
docker-compose restart app
```

## 🔧 Troubleshooting

### A aplicação não inicia

1. Verifique os logs:
```powershell
docker-compose logs app
```

2. Verifique se o banco está rodando:
```powershell
docker-compose ps
```

### Erro de conexão com banco de dados

Verifique se o serviço postgres está healthy:
```powershell
docker-compose ps postgres
```

Se não estiver, reinicie:
```powershell
docker-compose restart postgres
```

### Erro "NEXTAUTH_SECRET must be provided"

Você esqueceu de configurar a variável `NEXTAUTH_SECRET` no arquivo `.env`.

### Mudei o código mas não vejo as alterações

Rebuilde a imagem:
```powershell
docker-compose up -d --build
```

### Porta 3000 já está em uso

Altere a porta no arquivo `.env`:
```env
APP_PORT=3001
```

Depois reinicie:
```powershell
docker-compose down
docker-compose up -d
```

## 📦 Estrutura dos Arquivos Docker

```
financeiro/
├── Dockerfile              # Instruções para buildar a imagem
├── docker-compose.yml      # Orquestração dos serviços
├── docker-entrypoint.sh    # Script de inicialização
├── .dockerignore          # Arquivos ignorados no build
├── .env.docker            # Template de variáveis
└── .env                   # SEU arquivo de configuração (criar!)
```

## 🔄 Atualizando a Aplicação

Quando houver atualizações no código:

```powershell
# 1. Parar a aplicação
docker-compose down

# 2. Atualizar o código (git pull, etc)
git pull

# 3. Rebuildar e reiniciar
docker-compose up -d --build
```

## 🗑️ Limpeza Completa

Para remover tudo e começar do zero:

```powershell
# Parar e remover containers, networks e volumes
docker-compose down -v

# Remover imagens
docker rmi financeiro-app

# Remover volumes órfãos (opcional)
docker volume prune
```

## 📝 Notas de Produção

Se for usar em produção:

1. **Altere todas as senhas** no `.env`
2. Use um `NEXTAUTH_SECRET` forte e único
3. Configure `NEXT_PUBLIC_RP_ID` e `NEXT_PUBLIC_ORIGIN` com seu domínio real
4. Configure SSL/HTTPS (use um proxy reverso como Nginx ou Traefik)
5. Configure backups regulares do volume `postgres_data`
6. Não exponha a porta do PostgreSQL publicamente

## 🆘 Suporte

Em caso de problemas:

1. Verifique os logs: `docker-compose logs`
2. Verifique o status: `docker-compose ps`
3. Tente rebuildar: `docker-compose up -d --build`
4. Consulte a [documentação do Next.js](https://nextjs.org/docs)
5. Consulte a [documentação do Prisma](https://www.prisma.io/docs)
