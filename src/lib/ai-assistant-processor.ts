import { FinancialContext, ChatResponse, AssistantInsight } from '@/types/ai-assistant';
import { startOfMonth, endOfMonth, subMonths, format, parseISO, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Sistema de análise de perguntas do usuário
 * Identifica intenção e extrai parâmetros
 */
interface QueryIntent {
  action: 'balance' | 'expenses' | 'incomes' | 'goals' | 'category' | 'wallet' | 'creditCard' | 'summary' | 'savings' | 'comparison' | 'unknown';
  period?: { month: number; year: number };
  category?: string;
  wallet?: string;
  cardName?: string;
}

/**
 * Analisa a pergunta do usuário e identifica a intenção
 */
export function analyzeQuery(message: string): QueryIntent {
  const msg = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Remove acentos
  
  let intent: QueryIntent = { action: 'unknown' };

  // Detectar período (mês/ano)
  const monthNames: Record<string, number> = {
    'janeiro': 1, 'fevereiro': 2, 'marco': 3, 'abril': 4, 'maio': 5, 'junho': 6,
    'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12,
    'jan': 1, 'fev': 2, 'mar': 3, 'abr': 4, 'mai': 5, 'jun': 6,
    'jul': 7, 'ago': 8, 'set': 9, 'out': 10, 'nov': 11, 'dez': 12
  };

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Detectar "mês passado", "último mês"
  if (msg.includes('mes passado') || msg.includes('ultimo mes') || msg.includes('last month')) {
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    intent.period = { month: lastMonth, year: lastMonthYear };
  }
  // Detectar "este mês", "mês atual"
  else if (msg.includes('este mes') || msg.includes('esse mes') || msg.includes('mes atual') || msg.includes('this month')) {
    intent.period = { month: currentMonth, year: currentYear };
  }
  // Detectar nome do mês específico
  else {
    for (const [monthName, monthNum] of Object.entries(monthNames)) {
      if (msg.includes(monthName)) {
        // Tentar detectar ano
        const yearMatch = msg.match(/\b(20\d{2})\b/);
        const year = yearMatch ? parseInt(yearMatch[1]) : currentYear;
        intent.period = { month: monthNum, year };
        break;
      }
    }
  }

  // Se não detectou período, usar mês atual como padrão
  if (!intent.period && !msg.includes('total') && !msg.includes('geral')) {
    intent.period = { month: currentMonth, year: currentYear };
  }

  // Detectar ação principal
  if (msg.includes('saldo') || msg.includes('balance')) {
    if (msg.includes('carteira') || msg.includes('wallet') || msg.includes('conta')) {
      intent.action = 'wallet';
      // Tentar extrair nome da carteira
      const walletMatch = msg.match(/carteira\s+([a-z0-9\s]+?)(?:\s|$|\?)/i);
      if (walletMatch) intent.wallet = walletMatch[1].trim();
    } else {
      intent.action = 'balance';
    }
  }
  else if (msg.includes('gasto') || msg.includes('gastei') || msg.includes('despesa') || msg.includes('expense')) {
    intent.action = 'expenses';
    // Tentar extrair categoria
    const categoryIndicators = ['de ', 'em ', 'com ', 'categoria ', 'na categoria'];
    for (const indicator of categoryIndicators) {
      const idx = msg.indexOf(indicator);
      if (idx !== -1) {
        const afterIndicator = msg.substring(idx + indicator.length);
        const categoryMatch = afterIndicator.match(/^([a-z0-9çãáéíóúâêôàè\s]+?)(?:\s+mes|\s+em|\?|$)/i);
        if (categoryMatch) {
          intent.category = categoryMatch[1].trim();
          break;
        }
      }
    }
  }
  else if (msg.includes('ganho') || msg.includes('receita') || msg.includes('renda') || msg.includes('income')) {
    intent.action = 'incomes';
    // Tentar extrair categoria
    const categoryMatch = msg.match(/(?:de|em|com|categoria)\s+([a-z0-9çãáéíóúâêôàè\s]+?)(?:\s|$|\?)/i);
    if (categoryMatch) intent.category = categoryMatch[1].trim();
  }
  else if (msg.includes('meta') || msg.includes('objetivo') || msg.includes('goal')) {
    intent.action = 'goals';
  }
  else if (msg.includes('cartao') || msg.includes('credito') || msg.includes('credit card')) {
    intent.action = 'creditCard';
    const cardMatch = msg.match(/cartao\s+([a-z0-9\s]+?)(?:\s|$|\?)/i);
    if (cardMatch) intent.cardName = cardMatch[1].trim();
  }
  else if (msg.includes('resumo') || msg.includes('situacao') || msg.includes('overview') || msg.includes('summary')) {
    intent.action = 'summary';
  }
  else if (msg.includes('economizar') || msg.includes('poupar') || msg.includes('economias') || msg.includes('savings')) {
    intent.action = 'savings';
  }
  else if (msg.includes('comparar') || msg.includes('comparacao') || msg.includes('compare')) {
    intent.action = 'comparison';
  }
  // Se mencionou uma categoria sem verbo específico, assumir que quer ver gastos
  else if (!intent.action || intent.action === 'unknown') {
    const possibleCategory = msg.match(/^(?:quanto|qual|como)\s+.*?\s+([a-z0-9çãáéíóúâêôàè\s]{3,}?)(?:\s|$|\?)/i);
    if (possibleCategory) {
      intent.category = possibleCategory[1].trim();
      intent.action = 'expenses';
    }
  }

  return intent;
}

/**
 * Processa consulta de saldo de carteiras
 */
export function processWalletBalance(context: FinancialContext, walletName?: string): string {
  if (!context.wallets || context.wallets.length === 0) {
    return '🏦 Você ainda não possui carteiras cadastradas.';
  }

  if (walletName) {
    // Buscar carteira específica (fuzzy match)
    const wallet = context.wallets.find(w => 
      w.name.toLowerCase().includes(walletName.toLowerCase()) ||
      walletName.toLowerCase().includes(w.name.toLowerCase())
    );

    if (wallet) {
      return `💰 **${wallet.name}**: R$ ${wallet.balance.toFixed(2)}`;
    } else {
      return `❌ Carteira "${walletName}" não encontrada.\n\n` +
        `Suas carteiras:\n` +
        context.wallets.map(w => `• ${w.name}: R$ ${w.balance.toFixed(2)}`).join('\n');
    }
  }

  // Listar todas as carteiras
  let response = '💼 **Saldo das suas carteiras:**\n\n';
  const totalBalance = context.wallets.reduce((sum, w) => sum + w.balance, 0);
  
  context.wallets.forEach(wallet => {
    response += `• **${wallet.name}**: R$ ${wallet.balance.toFixed(2)}\n`;
  });
  
  response += `\n💰 **Total**: R$ ${totalBalance.toFixed(2)}`;
  
  return response;
}

/**
 * Processa consulta de despesas
 */
export function processExpenses(
  context: FinancialContext, 
  period?: { month: number; year: number },
  category?: string
): string {
  const { summary, topCategories } = context;
  
  let response = '';
  const periodStr = period 
    ? `em ${format(new Date(period.year, period.month - 1), 'MMMM/yyyy', { locale: ptBR })}`
    : 'nos últimos 3 meses';

  if (category) {
    // Buscar categoria específica (fuzzy match)
    const matchedCategory = topCategories.find(c => 
      c.type === 'EXPENSE' && (
        c.name.toLowerCase().includes(category.toLowerCase()) ||
        category.toLowerCase().includes(c.name.toLowerCase())
      )
    );

    if (matchedCategory) {
      response = `💰 **Gastos com ${matchedCategory.name}** ${periodStr}:\n\n`;
      response += `• Valor: R$ ${matchedCategory.total.toFixed(2)}\n`;
      response += `• Percentual: ${matchedCategory.percentage.toFixed(1)}% do total de despesas\n`;
      
      if (matchedCategory.percentage > 30) {
        response += `\n⚠️ Esta categoria representa uma parte significativa dos seus gastos!`;
      }
    } else {
      response = `❌ Categoria "${category}" não encontrada nos gastos ${periodStr}.\n\n`;
      response += `Suas principais categorias de despesa:\n`;
      topCategories
        .filter(c => c.type === 'EXPENSE')
        .slice(0, 5)
        .forEach(cat => {
          response += `• ${cat.name}: R$ ${cat.total.toFixed(2)}\n`;
        });
    }
  } else {
    // Resumo geral de despesas
    response = `💸 **Despesas ${periodStr}:**\n\n`;
    response += `• Total gasto: R$ ${summary.totalExpense.toFixed(2)}\n\n`;
    response += `**Principais categorias:**\n`;
    
    topCategories
      .filter(c => c.type === 'EXPENSE')
      .slice(0, 5)
      .forEach(cat => {
        response += `• ${cat.name}: R$ ${cat.total.toFixed(2)} (${cat.percentage.toFixed(1)}%)\n`;
      });
  }

  return response;
}

/**
 * Processa consulta de receitas
 */
export function processIncomes(
  context: FinancialContext,
  period?: { month: number; year: number },
  category?: string
): string {
  const { summary, topCategories } = context;
  
  let response = '';
  const periodStr = period 
    ? `em ${format(new Date(period.year, period.month - 1), 'MMMM/yyyy', { locale: ptBR })}`
    : 'nos últimos 3 meses';

  if (category) {
    const matchedCategory = topCategories.find(c => 
      c.type === 'INCOME' && (
        c.name.toLowerCase().includes(category.toLowerCase()) ||
        category.toLowerCase().includes(c.name.toLowerCase())
      )
    );

    if (matchedCategory) {
      response = `💵 **Receitas de ${matchedCategory.name}** ${periodStr}:\n\n`;
      response += `• Valor: R$ ${matchedCategory.total.toFixed(2)}\n`;
      response += `• Percentual: ${matchedCategory.percentage.toFixed(1)}% do total de receitas`;
    } else {
      response = `❌ Categoria "${category}" não encontrada nas receitas ${periodStr}.\n\n`;
      response += `Suas principais fontes de receita:\n`;
      topCategories
        .filter(c => c.type === 'INCOME')
        .forEach(cat => {
          response += `• ${cat.name}: R$ ${cat.total.toFixed(2)}\n`;
        });
    }
  } else {
    response = `💵 **Receitas ${periodStr}:**\n\n`;
    response += `• Total recebido: R$ ${summary.totalIncome.toFixed(2)}\n\n`;
    
    const incomeCategories = topCategories.filter(c => c.type === 'INCOME');
    if (incomeCategories.length > 0) {
      response += `**Fontes de receita:**\n`;
      incomeCategories.forEach(cat => {
        response += `• ${cat.name}: R$ ${cat.total.toFixed(2)} (${cat.percentage.toFixed(1)}%)\n`;
      });
    }
  }

  return response;
}

/**
 * Processa consulta de metas
 */
export function processGoals(context: FinancialContext): string {
  if (!context.goals || context.goals.length === 0) {
    return '🎯 Você ainda não definiu metas financeiras.\n\n' +
      'Estabelecer metas é fundamental para manter o foco! ' +
      'Que tal criar sua primeira meta?';
  }

  let response = '🎯 **Suas Metas Financeiras:**\n\n';
  
  context.goals.forEach((goal, idx) => {
    response += `${idx + 1}. **${goal.name}**\n`;
    response += `   • Meta: R$ ${goal.targetAmount.toFixed(2)}\n`;
    
    if (goal.progress > 0) {
      response += `   • Progresso: ${goal.progress.toFixed(1)}%\n`;
      response += `   • Falta: R$ ${(goal.targetAmount - goal.currentAmount).toFixed(2)}\n`;
      
      if (goal.progress >= 80 && goal.progress < 100) {
        response += `   ✨ Você está quase lá!\n`;
      } else if (goal.progress >= 100) {
        response += `   🎉 Meta alcançada!\n`;
      }
    }
    
    response += '\n';
  });

  return response;
}

/**
 * Processa resumo financeiro completo
 */
export function processSummary(
  context: FinancialContext,
  period?: { month: number; year: number }
): string {
  const { summary } = context;
  const periodStr = period 
    ? format(new Date(period.year, period.month - 1), 'MMMM/yyyy', { locale: ptBR })
    : 'últimos 3 meses';

  let response = `📊 **Resumo Financeiro (${periodStr}):**\n\n`;
  
  response += `💵 **Receitas:** R$ ${summary.totalIncome.toFixed(2)}\n`;
  response += `💸 **Despesas:** R$ ${summary.totalExpense.toFixed(2)}\n`;
  response += `💰 **Saldo:** R$ ${summary.balance.toFixed(2)}\n`;
  response += `📈 **Taxa de poupança:** ${summary.savingsRate.toFixed(1)}%\n\n`;

  // Status
  if (summary.balance > 0) {
    if (summary.savingsRate > 20) {
      response += '🎉 **Excelente!** Você está poupando mais de 20% da sua renda!\n';
    } else if (summary.savingsRate > 10) {
      response += '✅ **Bom trabalho!** Continue mantendo esse controle.\n';
    } else {
      response += '⚠️ **Atenção:** Tente aumentar sua taxa de poupança.\n';
    }
  } else {
    response += '🚨 **Alerta:** Suas despesas superam as receitas!\n';
  }

  // Top categorias de despesa
  response += '\n**Maiores gastos:**\n';
  context.topCategories
    .filter(c => c.type === 'EXPENSE')
    .slice(0, 3)
    .forEach((cat, idx) => {
      response += `${idx + 1}. ${cat.name}: R$ ${cat.total.toFixed(2)}\n`;
    });

  return response;
}

/**
 * Processa dicas de economia
 */
export function processSavings(context: FinancialContext): string {
  const { summary, recurringExpenses, topCategories } = context;
  
  let response = '💡 **Dicas para Economizar:**\n\n';

  // Análise de taxa de poupança
  response += `**1. Taxa de Poupança Atual: ${summary.savingsRate.toFixed(1)}%**\n`;
  if (summary.savingsRate < 15) {
    response += '   • Meta recomendada: 15-20%\n';
    const targetSavings = summary.totalIncome * 0.15;
    const neededCut = targetSavings - summary.balance;
    if (neededCut > 0) {
      response += `   • Você precisa economizar mais R$ ${neededCut.toFixed(2)} por mês\n`;
    }
  } else {
    response += '   • Você está indo bem! Continue assim.\n';
  }

  // Despesas recorrentes
  const totalRecurring = recurringExpenses.reduce((s, r) => s + r.amount, 0);
  if (totalRecurring > 0) {
    response += `\n**2. Despesas Recorrentes: R$ ${totalRecurring.toFixed(2)}/mês**\n`;
    response += '   • Revise assinaturas e serviços não utilizados\n';
    response += '   • Negocie melhores tarifas com fornecedores\n';
  }

  // Categoria de maior gasto
  const topExpense = topCategories.find(c => c.type === 'EXPENSE');
  if (topExpense && topExpense.percentage > 30) {
    response += `\n**3. Gastos altos em ${topExpense.name}**\n`;
    response += `   • Representa ${topExpense.percentage.toFixed(1)}% dos seus gastos\n`;
    const potentialSaving = topExpense.total * 0.1; // 10% de economia
    response += `   • Reduzir 10% economizaria R$ ${potentialSaving.toFixed(2)}\n`;
  }

  // Regra 50-30-20
  response += '\n**4. Regra 50-30-20:**\n';
  response += '   • 50% para necessidades\n';
  response += '   • 30% para desejos\n';
  response += '   • 20% para poupança/investimentos\n';

  return response;
}

/**
 * Gera resposta baseada na intenção identificada
 */
export function generateSmartResponse(
  intent: QueryIntent,
  context: FinancialContext
): ChatResponse {
  let message = '';
  
  switch (intent.action) {
    case 'wallet':
      message = processWalletBalance(context, intent.wallet);
      break;
      
    case 'balance':
      message = processWalletBalance(context);
      break;
      
    case 'expenses':
      message = processExpenses(context, intent.period, intent.category);
      break;
      
    case 'incomes':
      message = processIncomes(context, intent.period, intent.category);
      break;
      
    case 'goals':
      message = processGoals(context);
      break;
      
    case 'summary':
      message = processSummary(context, intent.period);
      break;
      
    case 'savings':
      message = processSavings(context);
      break;
      
    case 'comparison':
      message = '📊 Para comparações entre períodos, especifique os meses que deseja comparar.\n\n' +
        'Exemplo: "Compare meus gastos de outubro com novembro"';
      break;
      
    case 'creditCard':
      message = '💳 **Gastos com Cartão de Crédito**\n\n' +
        'Esta funcionalidade será implementada em breve para mostrar detalhes de faturas e gastos por cartão.';
      break;
      
    default:
      message = '❓ Desculpe, não entendi sua pergunta.\n\n' +
        '**Exemplos de perguntas que posso responder:**\n' +
        '• "Quanto gastei em alimentação mês passado?"\n' +
        '• "Qual o saldo da minha carteira?"\n' +
        '• "Quanto recebi este mês?"\n' +
        '• "Como estão minhas metas?"\n' +
        '• "Me dê um resumo financeiro"\n' +
        '• "Como posso economizar?"';
  }

  return {
    message,
    contextUsed: true,
    suggestions: [
      'Quanto gastei mês passado?',
      'Qual meu saldo total?',
      'Como estão minhas metas?',
      'Me dê dicas de economia'
    ]
  };
}
