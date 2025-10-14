'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Loader2, Edit, Trash2, CreditCard, RotateCcw, AlertTriangle } from 'lucide-react';
import RefundDialog from './refund-dialog';
import { Modal } from '../ui/modal';

interface CreditExpense {
  id: string;
  description: string;
  amount: number;
  purchaseDate: string;
  installments: number;
  type?: 'EXPENSE' | 'REFUND';
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
  billItems?: Array<{
    id: string;
    installmentNumber: number;
    amount: number;
    dueDate: string;
    bill?: {
      id: string;
      status: 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE';
      paidAmount: number;
      totalAmount: number;
    };
  }>;
  createdAt: string;
}

interface CreditExpensesListProps {
  onEdit?: (expenseId: string) => void;
  currentDate?: Date;
}

export default function CreditExpensesList({ onEdit, currentDate }: CreditExpensesListProps) {
  const [expenses, setExpenses] = useState<CreditExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  
  // Estados para o diálogo de estorno
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedExpenseForRefund, setSelectedExpenseForRefund] = useState<CreditExpense | null>(null);

  useEffect(() => {
    const loadExpenses = async () => {
      try {
        setLoading(true);
        setError(null);

        let url = '/api/credit-expenses';
        
        // Se uma data específica for fornecida, filtra por mês
        if (currentDate) {
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth();
          const startDate = new Date(year, month, 1).toISOString().split('T')[0];
          const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
          url += `?start=${startDate}&end=${endDate}`;
        }

        const response = await fetch(url);
      
      if (!response.ok) {
        console.error('❌ Erro HTTP:', response.status, response.statusText);
        throw new Error('Erro ao carregar gastos de crédito');
      }

      const data = await response.json();
      
      // A API retorna { data: [...], pagination: {...} }
      const expenses = data.data || data;
      setExpenses(Array.isArray(expenses) ? expenses : []);
    } catch (error) {
      console.error('Erro ao carregar gastos:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };
    
    loadExpenses();
  }, [currentDate, reloadKey]);

  const reloadExpenses = () => {
    setReloadKey(prev => prev + 1);
  };

  const handleRefundClick = async (expense: CreditExpense) => {
    // Buscar dados completos da compra para o estorno
    try {
      const response = await fetch(`/api/credit-expenses/${expense.id}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar dados da compra');
      }
      
      const fullExpenseData = await response.json();
      setSelectedExpenseForRefund(fullExpenseData);
      setRefundDialogOpen(true);
    } catch (error) {
      console.error('Erro ao carregar dados da compra:', error);
      alert('Erro ao carregar dados da compra para estorno');
    }
  };

  const handleRefundSuccess = () => {
    setRefundDialogOpen(false);
    setSelectedExpenseForRefund(null);
    reloadExpenses();
  };

  const handleRefundCancel = () => {
    setRefundDialogOpen(false);
    setSelectedExpenseForRefund(null);
  };

  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setConfirmingDelete(id);
  };

  const confirmDelete = async () => {
    if (!confirmingDelete) return;
    const id = confirmingDelete;
    setConfirmingDelete(null);

    try {
      const response = await fetch(`/api/credit-expenses/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir gasto');
      }

      // Recarregar a lista
      reloadExpenses();
    } catch (error) {
      console.error('Erro ao excluir gasto:', error);
      alert('Erro ao excluir gasto. Tente novamente.');
    }
  };

  const deleteExpense = handleDelete; // Manter compatibilidade com código existente

  const deletingExpense = confirmingDelete ? expenses.find((e) => e.id === confirmingDelete) : null;

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
          onClick={reloadExpenses}
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
                <td className="px-3 py-2 text-right font-semibold">
                  <div className="flex items-center justify-end gap-2">
                    <span className={expense.type === 'REFUND' ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(expense.amount)}
                    </span>
                    {expense.type === 'REFUND' && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                        ESTORNO
                      </Badge>
                    )}
                    {expense.tags?.some(tag => 
                      typeof tag === 'string' 
                        ? tag.includes('refunded') 
                        : false
                    ) && expense.type !== 'REFUND' && (
                      <Badge variant="outline" className="text-xs text-orange-600 border-orange-600">
                        ESTORNADO
                      </Badge>
                    )}
                  </div>
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
                    {expense.type !== 'REFUND' && (
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => handleRefundClick(expense)}
                        title="Estornar compra"
                        disabled={expense.tags?.some(tag => 
                          typeof tag === 'string' && tag.includes('refunded_full')
                        )}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
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

      {/* Diálogo de estorno */}
      <RefundDialog
        expense={selectedExpenseForRefund}
        open={refundDialogOpen}
        onClose={handleRefundCancel}
        onSuccess={handleRefundSuccess}
      />

      {/* Modal de confirmação de exclusão */}
      {confirmingDelete && (
        <Modal open={!!confirmingDelete} onClose={() => setConfirmingDelete(null)} size="sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 flex items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-red-700">Confirmar exclusão</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Tem certeza que deseja excluir este {deletingExpense?.type === 'REFUND' ? 'estorno' : 'gasto'}? Esta ação é irreversível e removerá todos os
                registros relacionados.
              </p>
              {deletingExpense && (
                <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">{deletingExpense.description}</p>
              )}
              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row sm:justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmingDelete(null)} className="w-full sm:w-auto">
                  Cancelar
                </Button>
                <Button
                  onClick={confirmDelete}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
                >
                  Excluir
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}