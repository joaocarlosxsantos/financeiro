'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2, Edit, Trash2, CreditCard, RotateCcw, AlertTriangle, Plus, X, Check } from 'lucide-react';
import RefundDialog from './refund-dialog';
import { Modal } from '../ui/modal';

interface CreditExpense {
  id: string;
  description: string;
  amount: number;
  purchaseDate: string;
  installments: number;
  type?: 'EXPENSE' | 'REFUND' | 'INCOME';
  isIncome?: boolean; // Flag para créditos vindos de CreditIncome
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
  
  // Estados para criação de categorias e tags
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showTagForm, setShowTagForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newTagName, setNewTagName] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Carregar gastos E créditos
        let url = '/api/credit-expenses';
        let incomesUrl = '/api/credit-incomes';
        
        // Se uma data específica for fornecida, filtra por mês
        if (currentDate) {
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth();
          const startDate = new Date(year, month, 1).toISOString().split('T')[0];
          const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
          const params = `?start=${startDate}&end=${endDate}`;
          url += params;
          incomesUrl += params;
        } else {
          
        }

        const [expensesRes, incomesRes, categoriesRes, tagsRes] = await Promise.all([
          fetch(url),
          fetch(incomesUrl),
          fetch('/api/categories'),
          fetch('/api/tags')
        ]);
      
        if (!expensesRes.ok) {
          console.error('❌ Erro HTTP:', expensesRes.status, expensesRes.statusText);
          throw new Error('Erro ao carregar gastos de crédito');
        }

        const expensesData = await expensesRes.json();
        const expensesArray = Array.isArray(expensesData) ? expensesData : (expensesData.data || []);

        // Processar créditos/estornos
        let incomesArray: any[] = [];
        if (incomesRes.ok) {
          const incomesData = await incomesRes.json();
          incomesArray = Array.isArray(incomesData) ? incomesData : (incomesData.data || []);
          // Adicionar flag para identificar como crédito
          incomesArray = incomesArray.map((income: any) => ({
            ...income,
            isIncome: true, // Flag para renderizar em verde
            type: 'INCOME',
            purchaseDate: income.date, // Compatibilidade com expenses
          }));
        }

        // Mesclar e ordenar por data
        const allTransactions = [...expensesArray, ...incomesArray].sort((a, b) => {
          const dateA = new Date(a.purchaseDate || a.date);
          const dateB = new Date(b.purchaseDate || b.date);
          return dateB.getTime() - dateA.getTime();
        });

        setExpenses(allTransactions);

        // Carregar categorias e tags se as requisições foram bem-sucedidas
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData);
        }
        
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          setTags(tagsData);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setError(error instanceof Error ? error.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentDate, reloadKey]);  const reloadExpenses = () => {
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

  // Funções para criar categoria e tag
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          type: 'EXPENSE',
          color: 'var(--c-3b82f6)'
        })
      });

      if (response.ok) {
        const newCategory = await response.json();
        setCategories(prev => [...prev, newCategory]);
        setNewCategoryName('');
        setShowCategoryForm(false);
      }
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: 'var(--c-6b7280)'
        })
      });

      if (response.ok) {
        const newTag = await response.json();
        setTags(prev => [...prev, newTag]);
        setNewTagName('');
        setShowTagForm(false);
      }
    } catch (error) {
      console.error('Erro ao criar tag:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    const dateObj = new Date(date);
    return dateObj.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
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

      {/* Seção de criação rápida de categorias e tags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/30">
        {/* Criar categoria */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground">Criar Nova Categoria</Label>
            <span className="text-xs text-muted-foreground">
              {categories.filter(cat => cat.type === 'EXPENSE' || cat.type === 'BOTH').length} disponíveis
            </span>
          </div>
          {!showCategoryForm ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCategoryForm(true)}
              className="w-full justify-start"
            >
              <Plus className="h-3 w-3 mr-2" />
              Nova Categoria de Despesa
            </Button>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Nome da categoria"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="text-xs h-8"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
              />
              <Button size="sm" onClick={handleCreateCategory} className="h-8 w-8 p-0">
                <Check className="h-3 w-3" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  setShowCategoryForm(false);
                  setNewCategoryName('');
                }}
                className="h-8 w-8 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Criar tag */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground">Criar Nova Tag</Label>
            <span className="text-xs text-muted-foreground">
              {tags.length} disponíveis
            </span>
          </div>
          {!showTagForm ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTagForm(true)}
              className="w-full justify-start"
            >
              <Plus className="h-3 w-3 mr-2" />
              Nova Tag
            </Button>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Nome da tag"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="text-xs h-8"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
              />
              <Button size="sm" onClick={handleCreateTag} className="h-8 w-8 p-0">
                <Check className="h-3 w-3" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  setShowTagForm(false);
                  setNewTagName('');
                }}
                className="h-8 w-8 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-muted bg-background shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-muted/60 text-muted-foreground border-b">
              <th className="px-4 py-3 text-left font-semibold min-w-[200px]">Descrição</th>
              <th className="px-4 py-3 text-right font-semibold min-w-[120px]">Valor</th>
              <th className="px-4 py-3 text-center font-semibold min-w-[100px]">Parcelas</th>
              <th className="px-4 py-3 text-center font-semibold min-w-[160px]">Data/Hora</th>
              <th className="px-4 py-3 text-center font-semibold min-w-[120px]">Cartão</th>
              <th className="px-4 py-3 text-center font-semibold min-w-[130px]">Categoria</th>
              <th className="px-4 py-3 text-center font-semibold min-w-[150px]">Tags</th>
              <th className="px-4 py-3 text-center font-semibold min-w-[120px]">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(expenses || []).map((expense) => (
              <tr key={expense.id} className="border-b hover:bg-accent/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground truncate max-w-[200px]" title={expense.description}>
                    {expense.description}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    ID: {expense.id.slice(-8)}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className={`font-semibold ${
                      (expense as any).isIncome || expense.type === 'INCOME' 
                        ? 'text-green-600' 
                        : expense.type === 'REFUND' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {formatCurrency(expense.amount)}
                    </span>
                    <div className="flex gap-1">
                      {((expense as any).isIncome || expense.type === 'INCOME') && (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                          CRÉDITO
                        </Badge>
                      )}
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
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <Badge variant="outline" className="text-xs font-medium">
                      {expense.installments}x
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(expense.amount / expense.installments)}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="text-xs font-mono">
                    {formatDate(expense.purchaseDate)}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant="secondary" className="text-xs font-medium">
                    {expense.creditCard.name}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    {expense.category ? (
                      <Badge variant="outline" className="text-xs font-medium">
                        {expense.category.name}
                      </Badge>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs text-muted-foreground">Sem categoria</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => setShowCategoryForm(true)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Criar
                        </Button>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    {expense.tags && expense.tags.length > 0 ? (
                      <div className="flex items-center justify-center gap-1 flex-wrap max-w-[140px]">
                        {expense.tags.map((tag: any, index: number) => {
                          const tagKey = typeof tag === 'string' ? tag : (tag?.id || `tag-${index}`);
                          const tagName = typeof tag === 'string' ? tag : (tag?.name || 'Tag sem nome');
                          
                          return (
                            <Badge
                              key={tagKey}
                              variant="secondary"
                              className="text-xs px-2 py-0.5"
                            >
                              {tagName}
                            </Badge>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs text-muted-foreground">Sem tags</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => setShowTagForm(true)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Criar
                        </Button>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {expense.type !== 'REFUND' && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleRefundClick(expense)}
                        title="Estornar compra"
                        disabled={expense.tags?.some(tag => 
                          typeof tag === 'string' && tag.includes('refunded_full')
                        )}
                        className="h-8 w-8 p-0"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => {
                        if (onEdit) {
                          onEdit(expense.id);
                        } else {
                          alert('Funcionalidade de edição não configurada');
                        }
                      }}
                      title="Editar gasto"
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => deleteExpense(expense.id)}
                      title="Excluir gasto"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
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