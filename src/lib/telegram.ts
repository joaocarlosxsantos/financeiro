/**
 * Integração com Telegram Bot
 * 
 * Permite interação com o app via Telegram
 * @module lib/telegram
 */

import { prisma } from './prisma';

export interface TelegramMessage {
  chat_id: string | number;
  text: string;
  parse_mode?: 'Markdown' | 'HTML';
  reply_markup?: any;
}

/**
 * Envia mensagem via Telegram Bot API
 */
export async function sendTelegramMessage(
  botToken: string,
  message: TelegramMessage
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}

/**
 * Processa comando do Telegram
 */
export async function processTelegramCommand(
  userId: string,
  command: string,
  args: string[]
): Promise<string> {
  try {
    switch (command) {
      case '/saldo':
      case '/balance':
        return await getBalanceMessage(userId);
      
      case '/despesas':
      case '/expenses':
        return await getExpensesMessage(userId);
      
      case '/receitas':
      case '/income':
        return await getIncomeMessage(userId);
      
      case '/resumo':
      case '/summary':
        return await getSummaryMessage(userId);
      
      case '/metas':
      case '/goals':
        return await getGoalsMessage(userId);
      
      case '/ajuda':
      case '/help':
        return getHelpMessage();
      
      default:
        return 'Comando não reconhecido. Use /ajuda para ver os comandos disponíveis.';
    }
  } catch (error) {
    console.error('Error processing Telegram command:', error);
    return 'Erro ao processar comando. Tente novamente mais tarde.';
  }
}

/**
 * Retorna mensagem com saldo atual
 */
async function getBalanceMessage(userId: string): Promise<string> {
  const wallets = await prisma.wallet.findMany({
    where: { userId },
    select: {
      name: true,
      balance: true,
      currency: true,
    },
  });

  if (wallets.length === 0) {
    return '💰 Você ainda não tem carteiras cadastradas.';
  }

  let message = '💰 *Seus Saldos*\n\n';
  
  let total = 0;
  for (const wallet of wallets) {
    const balance = Number(wallet.balance);
    total += balance;
    message += `• ${wallet.name}: R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
  }
  
  message += `\n*Total:* R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  
  return message;
}

/**
 * Retorna mensagem com despesas do mês
 */
async function getExpensesMessage(userId: string): Promise<string> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    include: {
      category: true,
    },
    orderBy: {
      amount: 'desc',
    },
    take: 10,
  });

  if (expenses.length === 0) {
    return '📊 Nenhuma despesa registrada este mês.';
  }

  const total = expenses.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0);
  
  let message = '📊 *Despesas do Mês*\n\n';
  
  for (const expense of expenses.slice(0, 5)) {
    const amount = Number(expense.amount);
    message += `• ${expense.description}: R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    if (expense.category) {
      message += `  _${expense.category.name}_\n`;
    }
  }
  
  if (expenses.length > 5) {
    message += `\n_...e mais ${expenses.length - 5} despesas_\n`;
  }
  
  message += `\n*Total:* R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  
  return message;
}

/**
 * Retorna mensagem com receitas do mês
 */
async function getIncomeMessage(userId: string): Promise<string> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const incomes = await prisma.income.findMany({
    where: {
      userId,
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    orderBy: {
      amount: 'desc',
    },
  });

  if (incomes.length === 0) {
    return '💵 Nenhuma receita registrada este mês.';
  }

  const total = incomes.reduce((sum: number, inc: any) => sum + Number(inc.amount), 0);
  
  let message = '💵 *Receitas do Mês*\n\n';
  
  for (const income of incomes.slice(0, 5)) {
    const amount = Number(income.amount);
    message += `• ${income.description}: R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
  }
  
  if (incomes.length > 5) {
    message += `\n_...e mais ${incomes.length - 5} receitas_\n`;
  }
  
  message += `\n*Total:* R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  
  return message;
}

/**
 * Retorna mensagem com resumo financeiro
 */
async function getSummaryMessage(userId: string): Promise<string> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [expenses, incomes, wallets] = await Promise.all([
    prisma.expense.findMany({
      where: {
        userId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
    }),
    prisma.income.findMany({
      where: {
        userId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
    }),
    prisma.wallet.findMany({
      where: { userId },
    }),
  ]);

  const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0);
  const totalIncome = incomes.reduce((sum: number, inc: any) => sum + Number(inc.amount), 0);
  const totalBalance = wallets.reduce((sum: number, w: any) => sum + Number(w.balance), 0);
  const balance = totalIncome - totalExpenses;

  let message = '📈 *Resumo Financeiro*\n\n';
  message += `💰 Saldo Total: R$ ${totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;
  message += `📊 *Este Mês:*\n`;
  message += `• Receitas: R$ ${totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
  message += `• Despesas: R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
  message += `• Saldo: R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  
  if (balance >= 0) {
    message += ' ✅';
  } else {
    message += ' ⚠️';
  }

  return message;
}

/**
 * Retorna mensagem com metas
 */
async function getGoalsMessage(userId: string): Promise<string> {
  const goals = await prisma.goal.findMany({
    where: {
      userId,
      isActive: true,
    },
    orderBy: {
      deadline: 'asc',
    },
    take: 5,
  });

  if (goals.length === 0) {
    return '🎯 Você ainda não tem metas cadastradas.';
  }

  let message = '🎯 *Suas Metas*\n\n';
  
  for (const goal of goals) {
    const current = Number(goal.currentAmount);
    const target = Number(goal.targetAmount);
    const percentage = target > 0 ? (current / target) * 100 : 0;
    
    message += `• ${goal.name}\n`;
    message += `  ${percentage.toFixed(0)}% (R$ ${current.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ ${target.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})\n`;
    
    if (goal.deadline) {
      const daysLeft = Math.ceil((goal.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      message += `  _${daysLeft} dias restantes_\n`;
    }
    message += '\n';
  }

  return message;
}

/**
 * Retorna mensagem de ajuda
 */
function getHelpMessage(): string {
  return `
🤖 *Comandos Disponíveis*

💰 /saldo - Ver saldo das carteiras
📊 /despesas - Despesas do mês
💵 /receitas - Receitas do mês
📈 /resumo - Resumo financeiro
🎯 /metas - Suas metas
❓ /ajuda - Esta mensagem

_Use os comandos para consultar suas informações financeiras rapidamente!_
  `.trim();
}
