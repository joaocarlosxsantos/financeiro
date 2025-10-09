# Novo Endpoint: Saldo de Carteira por ID

## 📍 Endpoint Criado:

```
GET /api/shortcuts/balances/{id}
```

**Onde `{id}` é o ID da carteira**

## 🔧 Arquivo Criado:

`src/app/api/shortcuts/balances/[id]/route.ts`

## 📊 Funcionalidades:

### ✅ **Recebe:**
- **Parâmetro**: ID da carteira na URL
- **Autenticação**: Via sessão ou API key

### ✅ **Retorna:**
```json
{
  "id": "cmfbvocqr0001l204zrea4kdb",
  "name": "Inter", 
  "type": "BANK",
  "balance": 1218.27,
  "balanceFormatted": "R$ 1.218,27"
}
```

### ✅ **Validações:**
- ✅ Verifica se carteira existe
- ✅ Verifica se carteira pertence ao usuário autenticado
- ✅ Retorna erro 404 se carteira não encontrada
- ✅ Retorna erro 401 se não autenticado

## 🌐 Exemplos de Uso:

### Via API Key:
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:3000/api/shortcuts/balances/cmfbvocqr0001l204zrea4kdb
```

### Via JavaScript (com sessão):
```javascript
const response = await fetch('/api/shortcuts/balances/cmfbvocqr0001l204zrea4kdb');
const wallet = await response.json();
console.log(wallet.name, wallet.balanceFormatted);
```

### Via Shortcuts iOS:
```
GET http://localhost:3000/api/shortcuts/balances/cmfbvocqr0001l204zrea4kdb
Headers: Authorization: Bearer YOUR_API_KEY
```

## 🎯 Casos de Uso:

1. **Shortcuts iOS**: Obter saldo específico para automações
2. **Integração**: APIs externas consultarem saldo de carteira específica  
3. **Widgets**: Exibir saldo de carteira em widgets personalizados
4. **Monitoramento**: Scripts de monitoramento de saldos específicos

## 📋 IDs de Carteiras Disponíveis:

```
1. Inter: cmfbvocqr0001l204zrea4kdb (R$ 1.218,27)
2. Nubank: cmfbvt5t10001l104rp6cv5dp (-R$ 0,00)  
3. Itaú: cmfbwkuzx0001l4043yoyjxkj (-R$ 10.199,06)
4. Alelo Alimentação: cmfbwlh4b0001l805b5mzz7hf (R$ 2,52)
5. Alelo Refeição: cmfbwlo3i0003l805a6vzx07o (-R$ 1.311,01)
```

## 🔍 Códigos de Resposta:

- **200**: Sucesso - retorna dados da carteira
- **400**: ID da carteira não fornecido
- **401**: Não autenticado
- **404**: Carteira não encontrada ou não pertence ao usuário
- **500**: Erro interno do servidor

## ⚡ Performance:

- ✅ **Consulta Otimizada**: Busca apenas a carteira específica
- ✅ **Cálculo Inteligente**: Usa saldo pré-calculado quando disponível
- ✅ **Expansão de Fixos**: Inclui receitas/despesas recorrentes
- ✅ **Cache Headers**: Suporte a cache quando necessário

## 🔗 Endpoints Relacionados:

- `GET /api/shortcuts/balances` - Lista todas as carteiras com saldo
- `GET /api/wallets` - CRUD completo de carteiras  
- `GET /api/wallets/{id}` - Detalhes completos de carteira específica

**Status: ✅ Criado e Testado com Sucesso!**