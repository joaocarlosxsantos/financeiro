# Ordenação de Carteiras por Valor Decrescente

## Arquivo Modificado: `src/components/wallets/carteiras-content.tsx`

### ✅ Alteração Implementada:

**Adicionada ordenação por saldo decrescente** na listagem de carteiras da interface web.

### 🔧 Implementação:

```tsx
{wallets
  .slice() // Criar uma cópia para não modificar o array original
  .sort((a, b) => {
    // Calcular saldo para ordenação
    const getSaldo = (wallet: Wallet) => {
      const saldoFromBackend = typeof wallet.balance === 'number' ? wallet.balance : undefined;
      const saldoFallback =
        (wallet.incomes?.reduce((acc: number, i: { amount: number | string }) => acc + Number(i.amount), 0) || 0) -
        (wallet.expenses?.reduce((acc: number, e: { amount: number | string }) => acc + Number(e.amount), 0) || 0);
      const saldoRaw = typeof saldoFromBackend === 'number' ? saldoFromBackend : saldoFallback;
      return Object.is(saldoRaw, -0) ? 0 : saldoRaw;
    };
    
    const saldoA = getSaldo(a);
    const saldoB = getSaldo(b);
    
    // Ordenação decrescente (maior valor primeiro)
    return saldoB - saldoA;
  })
  .map((wallet) => {
    // ... resto do código de renderização
  })}
```

### 📊 Resultado do Teste:

**ANTES da ordenação (ordem da API):**
1. Inter - R$ 1.218,27
2. Nubank - -R$ 0,00
3. Itaú - -R$ 10.199,06
4. Alelo Alimentação - R$ 2,52
5. Alelo Refeição - -R$ 1.311,01

**DEPOIS da ordenação (interface web):**
1. Inter - R$ 1.218,27 ⬆️
2. Alelo Alimentação - R$ 2,52 ⬆️
3. Nubank - -R$ 0,00 ⬆️
4. Alelo Refeição - -R$ 1.311,01 ⬆️
5. Itaú - -R$ 10.199,06 ⬇️

### 🎯 Características da Ordenação:

1. **Saldo Decrescente**: Maior valor primeiro, menor valor por último
2. **Saldos Positivos**: Aparecem no topo da lista
3. **Saldo Zero**: Aparece após saldos positivos
4. **Saldos Negativos**: Aparecem no final, ordenados do menos negativo para o mais negativo
5. **Não Destrutivo**: Usa `.slice()` para não modificar o array original

### 🔄 Compatibilidade:

- ✅ **Backend**: Nenhuma alteração necessária na API
- ✅ **Dados**: Respeita tanto saldo pré-calculado quanto cálculo manual
- ✅ **Performance**: Ordenação executada apenas no frontend
- ✅ **Responsividade**: Funciona em todos os dispositivos

### 📱 Impacto na UX:

- **Melhor Visibilidade**: Carteiras com saldo positivo ficam em destaque
- **Organização Lógica**: Usuário vê primeiro suas carteiras com dinheiro
- **Priorização**: Carteiras problemáticas (saldo muito negativo) ficam por último
- **Consistência**: Mesma lógica de ordenação da API de shortcuts/balances

**Status: ✅ Implementado e Testado com Sucesso!**