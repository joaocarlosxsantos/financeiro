// Script para criar um registro recorrente de teste via API
const https = require('https');

// URL da API local
const BASE_URL = 'http://localhost:3000';

// Você precisa estar autenticado - pegue o token do navegador
// Abra o DevTools -> Application -> Cookies -> next-auth.session-token

async function createRecurringIncome() {
  console.log('📝 Para criar um registro recorrente de teste:');
  console.log('');
  console.log('1. Abra http://localhost:3000');
  console.log('2. Clique em "+ Nova Renda"');
  console.log('3. Preencha:');
  console.log('   - Descrição: Salário Mensal Recorrente');
  console.log('   - Valor: 5000');
  console.log('   - Data: 05/11/2025');
  console.log('   - ✅ MARQUE "Recorrente"');
  console.log('   - Selecione categoria e carteira');
  console.log('4. Salve');
  console.log('');
  console.log('5. Veja os logs no terminal - deve aparecer:');
  console.log('   === CRIANDO INCOME ===');
  console.log('   isRecurring: true');
  console.log('   startDate: 2025-11-05T00:00:00.000Z');
  console.log('   endDate: null');
  console.log('   dayOfMonth: 5');
  console.log('   ======================');
  console.log('');
  console.log('6. Depois acesse "Carteiras" e veja os novos logs');
  console.log('   [expandFixedRecords] Registros recorrentes: 1 ✅');
  console.log('');
}

createRecurringIncome();
