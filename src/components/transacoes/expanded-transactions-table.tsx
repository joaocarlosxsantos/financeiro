'use client';

import { useEffect, useState, useRef } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, Pencil, Trash } from 'lucide-react';
import { TransactionFormModal } from './transaction-form-modal';
import { ConfirmDeleteModal } from './confirm-delete-modal';

interface ExpandedTransaction {
  id: string;
  originalId: string;
  description: string;
  amount: string;
  date: string;
  type: 'PUNCTUAL' | 'RECURRING';
  category: {
    id: string;
    name: string;
    color: string;
    icon?: string | null;
  } | null;
  wallet: {
    id: string;
    name: string;
    type: string;
  };
  tags: string[];
  paymentType: string;
  transferId: string | null;
  isRecurringExpanded: boolean;
  recurringInfo?: {
    dayOfMonth: number;
    originalStartDate: string | null;
    originalEndDate: string | null;
    occurrenceMonth: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ExpandedTransactionsTableProps {
  transactionType: 'expense' | 'income';
  from: string;
  to: string;
  currentDate: Date;
  reloadFlag?: number;
}

export function ExpandedTransactionsTable({
  transactionType,
  from,
  to,
  currentDate,
  reloadFlag,
}: ExpandedTransactionsTableProps) {
  const [data, setData] = useState<ExpandedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, [transactionType, from, to, reloadFlag]);

  // Ref para a div da tabela para preservar scroll
  const tableRef = useRef<HTMLDivElement>(null);
  // Função para buscar e atualizar mantendo scroll
  const fetchTransactions = async (preserveScroll = false) => {
    let scrollTop = 0;
    if (preserveScroll && tableRef.current) {
      scrollTop = tableRef.current.scrollTop;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        type: transactionType,
        from,
        to,
        sort: 'date_desc',
        limit: '500',
      });
      const response = await fetch(`/api/transactions/expanded?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar transações');
      }
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
      // Restaurar scroll
      if (preserveScroll && tableRef.current) {
        tableRef.current.scrollTop = scrollTop;
      }
    }
  };

  const getCategoryColor = (category: ExpandedTransaction['category']) => {
    return category?.color || '#9CA3AF';
  };

  const formatAmount = (amount: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(amount));
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr + 'T00:00:00'), 'dd/MMM', { locale: pt });
  };


  // Estado para modais
  const [editModal, setEditModal] = useState<{ open: boolean; transaction: ExpandedTransaction | null }>({ open: false, transaction: null });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; transaction: ExpandedTransaction | null }>({ open: false, transaction: null });
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [wallets, setWallets] = useState<{ id: string; name: string }[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);

  // Carregar categorias e carteiras ao montar
  useEffect(() => {
    (async () => {
      try {
        const [catRes, walRes, tagsRes] = await Promise.all([
          fetch('/api/categories?&_=' + Date.now()),
          fetch('/api/wallets?&_=' + Date.now()),
          fetch('/api/tags?&_=' + Date.now()),
        ]);
        if (catRes.ok) setCategories(await catRes.json());
        if (walRes.ok) setWallets(await walRes.json());
        if (tagsRes.ok) setTags(await tagsRes.json());
      } catch {}
    })();
  }, []);

  const handleEdit = (transaction: ExpandedTransaction) => {
    // Extrair categoryId, walletId e tagIds para o modal
    // Converter nomes de tags para IDs
    const tagIds = transaction.tags
      .map(tagName => {
        const tag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
        return tag?.id;
      })
      .filter((id): id is string => id !== undefined);
    
    const initialData = {
      ...transaction,
      categoryId: transaction.category?.id || '',
      walletId: transaction.wallet?.id || '',
      tagIds: tagIds,
      transactionType: transactionType, // Tipo expense ou income separado
    };
    
    setEditModal({ open: true, transaction: initialData as any });
  };
  const handleDelete = (transaction: ExpandedTransaction) => {
    setDeleteModal({ open: true, transaction });
  };

  const handleEditSubmit = async (form: any) => {
    if (!editModal.transaction) return;
    await fetch(`/api/transactions/${editModal.transaction.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setEditModal({ open: false, transaction: null });
    fetchTransactions(true); // preserva scroll
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('transactions:reloadSummary'));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.transaction) return;
    // Se for recorrente expandida, usa o originalId
    const idToDelete = deleteModal.transaction.isRecurringExpanded
      ? deleteModal.transaction.originalId
      : deleteModal.transaction.id;
    await fetch(`/api/transactions/${idToDelete}`, { method: 'DELETE' });
    setDeleteModal({ open: false, transaction: null });
    fetchTransactions(true); // preserva scroll
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Carregando transações...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600 dark:text-red-400">{error}</div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Nenhuma transação encontrada
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TransactionFormModal
        open={editModal.open}
        onClose={() => setEditModal({ open: false, transaction: null })}
        onSubmit={handleEditSubmit}
        initialData={editModal.transaction}
        title="Editar Transação"
        categories={categories}
        wallets={wallets}
        tags={tags}
      />
      <ConfirmDeleteModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, transaction: null })}
        onConfirm={handleDeleteConfirm}
        description={deleteModal.transaction?.description}
      />
      <div ref={tableRef} className="overflow-x-auto overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700" style={{ maxHeight: '600px' }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-gray-100">Data</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-gray-100">Descrição</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-gray-100">Categoria</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-gray-100">Carteira</th>
              <th className="text-right py-4 px-4 font-semibold text-gray-900 dark:text-gray-100">Valor</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-gray-100">Tags</th>
              <th className="text-center py-4 px-4 font-semibold text-gray-900 dark:text-gray-100">Ações</th>
            </tr>
          </thead>
          <tbody>
            {data.map((transaction) => (
              <tr
                key={transaction.id}
                className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <td className="py-3 px-4 text-gray-900 dark:text-gray-100 font-medium">
                  {formatDate(transaction.date)}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {transaction.isRecurringExpanded && (
                      <span
                        className="inline-block w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full flex-shrink-0"
                        title="Transação recorrente expandida (simulada para este mês)"
                      ></span>
                    )}
                    <span className="text-gray-900 dark:text-gray-100">
                      {transaction.description}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {transaction.category && (
                      <>
                        <div
                          className="w-3 h-3 rounded flex-shrink-0 border border-gray-300 dark:border-gray-600"
                          style={{ backgroundColor: getCategoryColor(transaction.category) }}
                        ></div>
                        <span className="text-gray-900 dark:text-gray-100">
                          {transaction.category.name}
                        </span>
                      </>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-900 dark:text-gray-100 text-sm font-medium">
                  {transaction.wallet.name}
                </td>
                <td className="py-3 px-4 text-right font-semibold text-gray-900 dark:text-gray-100">
                  {formatAmount(transaction.amount)}
                </td>
                <td className="py-3 px-4">
                  {transaction.tags.length > 0 ? (
                    <div className="flex gap-1 flex-wrap">
                      {transaction.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Ações</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(transaction)}>
                        <Pencil className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(transaction)} className="text-red-600 focus:text-red-700">
                        <Trash className="mr-2 h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Resumo */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          <strong className="text-gray-900 dark:text-gray-100">
            Total ({data.length} transações):
          </strong>{' '}
          <span className="font-bold text-gray-900 dark:text-gray-100">
            {formatAmount(data.reduce((sum, t) => sum + Number(t.amount), 0).toString())}
          </span>
        </div>
      </div>
    </div>
  );
}
