#!/bin/sh
set -e

echo "🚀 Iniciando aplicação..."

echo "📦 Verificando conexão com banco de dados..."

# Aguardar banco de dados estar disponível
timeout=60
counter=0
until nc -z postgres 5432 2>/dev/null; do
  echo "⏳ Aguardando banco de dados ficar disponível... ($counter/$timeout)"
  sleep 2
  counter=$((counter + 2))
  if [ $counter -ge $timeout ]; then
    echo "❌ Timeout aguardando banco de dados"
    exit 1
  fi
done

echo "✅ Banco de dados pronto!"
echo "🔄 Aplicando migrações..."

# Verificar se prisma CLI está disponível e aplicar migrações
if command -v prisma > /dev/null 2>&1; then
  prisma migrate deploy || echo "⚠️  Nenhuma migração pendente"
elif [ -f "./node_modules/.bin/prisma" ]; then
  ./node_modules/.bin/prisma migrate deploy || echo "⚠️  Nenhuma migração pendente"
else
  echo "⚠️  Prisma CLI não encontrado. Pulando migrações..."
fi

echo "✨ Aplicação pronta para iniciar!"

# Executar comando passado como argumento
exec "$@"
