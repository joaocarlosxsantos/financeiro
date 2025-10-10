'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Loader2, Edit, Trash2, CreditCard } from 'lucide-react';

interface CreditExpense {
  id: string;
  description: string;
  amount: number;
  purchaseDate: string;
  installments: number;
  creditCard: {
    id: string;
    name: string;
    bank: string;
  };
  category?: {
    id: string;
    name: string;
  };
  tags: Array<string | {
    id: string;
    name: string;
  }>;
  createdAt: string;
}

interface CreditExpensesListProps {
  onEdit?: (expenseId: string) => void;
}

export default function CreditExpensesList({ onEdit }: CreditExpensesListProps) {
  const [expenses, setExpenses] = useState<CreditExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Carregando gastos de crédito...');
      const response = await fetch('/api/credit-expenses');
      
      if (!response.ok) {
        console.error('❌ Erro HTTP:', response.status, response.statusText);
        throw new Error('Erro ao carregar gastos de crédito');
      }

      const data = await response.json();
      console.log('📦 Dados recebidos da API:', data);
      
      // A API retorna { data: [...], pagination: {...} }
      const expenses = data.data || data;
      console.log('📋 Gastos processados:', expenses);
      setExpenses(Array.isArray(expenses) ? expenses : []);
    } catch (error) {
      console.error('Erro ao carregar gastos:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este gasto? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const response = await fetch(`/api/credit-expenses/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir gasto');
      }

      // Recarregar a lista
      await loadExpenses();
    } catch (error) {
      console.error('Erro ao excluir gasto:', error);
      alert('Erro ao excluir gasto. Tente novamente.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Carregando gastos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
        <p><strong>Erro:</strong> {error}</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadExpenses}
          className="mt-2"
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum gasto registrado</h3>
          <p className="text-muted-foreground">
            Você ainda não possui gastos registrados no cartão de crédito.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Gastos de Crédito</h3>
        <div className="text-sm text-muted-foreground">
          {expenses.length} {expenses.length === 1 ? 'gasto' : 'gastos'}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-muted bg-background">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-muted text-muted-foreground">
              <th className="px-3 py-2 text-left font-semibold">Descrição</th>
              <th className="px-3 py-2 text-right font-semibold">Valor</th>
              <th className="px-3 py-2 text-center font-semibold">Parcelas</th>
              <th className="px-3 py-2 text-center font-semibold">Data</th>
              <th className="px-3 py-2 text-center font-semibold">Cartão</th>
              <th className="px-3 py-2 text-center font-semibold">Categoria</th>
              <th className="px-3 py-2 text-center font-semibold">Tags</th>
              <th className="px-3 py-2 text-center font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(expenses || []).map((expense) => (
              <tr key={expense.id} className="border-b hover:bg-accent transition-colors">
                <td className="px-3 py-2 max-w-xs truncate">{expense.description}</td>
                <td className="px-3 py-2 text-right text-red-600 font-semibold">
                  {formatCurrency(expense.amount)}
                </td>
                <td className="px-3 py-2 text-center">
                  <Badge variant="outline" className="text-xs">
                    {expense.installments}x de {formatCurrency(expense.amount / expense.installments)}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-center">
                  {formatDate(expense.purchaseDate)}
                </td>
                <td className="px-3 py-2 text-center">
                  <Badge variant="secondary" className="text-xs">
                    {expense.creditCard.name}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-center">
                  {expense.category ? (
                    <Badge variant="outline" className="text-xs">
                      {expense.category.name}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {expense.tags && expense.tags.length > 0 ? (
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      {expense.tags.map((tag: any, index: number) => {
                        const tagKey = typeof tag === 'string' ? tag : (tag?.id || `tag-${index}`);
                        const tagName = typeof tag === 'string' ? tag : (tag?.name || 'Tag sem nome');
                        
                        return (
                          <span
                            key={tagKey}
                            className="inline-block px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                          >
                            {tagName}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => {
                        if (onEdit) {
                          onEdit(expense.id);
                        } else {
                          alert('Funcionalidade de edição não configurada');
                        }
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => deleteExpense(expense.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}