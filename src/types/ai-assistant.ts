/**
 * Tipos para o Assistente Financeiro de IA
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface FinancialContext {
  userId: string;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    savingsRate: number;
  };
  topCategories: Array<{
    name: string;
    type: 'EXPENSE' | 'INCOME';
    total: number;
    percentage: number;
  }>;
  wallets: Array<{
    id: string;
    name: string;
    balance: number;
  }>;
  recurringExpenses: Array<{
    description: string;
    amount: number;
    frequency: string;
  }>;
  goals?: Array<{
    name: string;
    targetAmount: number;
    currentAmount: number;
    progress: number;
  }>;
  recentTransactions: Array<{
    date: Date;
    description: string;
    amount: number;
    type: 'EXPENSE' | 'INCOME';
    category?: string;
  }>;
}

export interface AssistantInsight {
  type: 'savings' | 'spending' | 'budget' | 'goal' | 'warning' | 'tip';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestion?: string;
  impact?: {
    amount?: number;
    percentage?: number;
  };
}

export interface ChatResponse {
  message: string;
  insights?: AssistantInsight[];
  contextUsed?: boolean;
  suggestions?: string[];
}

export interface AssistantRequest {
  message: string;
  conversationHistory?: ChatMessage[];
  includeContext?: boolean;
}
