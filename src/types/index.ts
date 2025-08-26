export interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  type: 'EXPENSE' | 'INCOME' | 'BOTH';
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: Date;
  type: 'FIXED' | 'VARIABLE';
  isFixed: boolean;
  startDate: Date | null;
  endDate: Date | null;
  dayOfMonth: number | null;
  categoryId: string | null;
  category: Category | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Income {
  id: string;
  description: string;
  amount: number;
  date: Date;
  type: 'FIXED' | 'VARIABLE';
  isFixed: boolean;
  startDate: Date | null;
  endDate: Date | null;
  dayOfMonth: number | null;
  categoryId: string | null;
  category: Category | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardData {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  expensesByCategory: Array<{
    category: string;
    amount: number;
    color: string;
  }>;
  incomesByCategory: Array<{
    category: string;
    amount: number;
    color: string;
  }>;
  monthlyData: Array<{
    month: string;
    income: number;
    expenses: number;
  }>;
}
