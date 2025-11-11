'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from './modal';
import { Button } from './button';
import { Select } from './select';
import { Label } from './label';
import { Input } from './input';
import { CreditCard, Calendar, DollarSign, Link, Search } from 'lucide-react';

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category?: {
    name: string;
  };
  wallet?: {
    id: string;
    name: string;
  };
}

interface Wallet {
  id: string;
  name: string;
  type: string;
}

interface PayBillModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: { amount: number; paymentDate: string; walletId: string; expenseId?: string }) => void;
  billAmount: number;
  billDueDate: string;
  loading?: boolean;
}

export function PayBillModal({
  open,
  onClose,
  onConfirm,
  billAmount,
  billDueDate,
  loading = false,
}: PayBillModalProps) {
  const [amount, setAmount] = useState(billAmount.toFixed(2));
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [walletId, setWalletId] = useState<string>('');
  const [expenseId, setExpenseId] = useState<string>('');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Carregar carteiras
  useEffect(() => {
    if (open) {
      loadWallets();
      loadExpenses();
    }
  }, [open, billDueDate]);

  const loadWallets = async () => {
    setLoadingWallets(true);
    try {
      const response = await fetch('/api/wallets');
      if (!response.ok) throw new Error('Erro ao carregar carteiras');

      const data = await response.json();
      // API retorna array diretamente, não { data: [] }
      setWallets(Array.isArray(data) ? data : []);
      
      // Selecionar primeira carteira por padrão
      if (Array.isArray(data) && data.length > 0) {
        setWalletId(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar carteiras:', error);
    } finally {
      setLoadingWallets(false);
    }
  };

  const loadExpenses = async () => {
    setLoadingExpenses(true);
    try {
      // Extrair ano e mês da data de vencimento
      const dueDate = new Date(billDueDate);
      const year = dueDate.getFullYear();
      const month = dueDate.getMonth() + 1; // 1-12
      
      // Calcular primeiro e último dia do mês
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const response = await fetch(`/api/expenses?start=${startDate}&end=${endDate}`);
      if (!response.ok) throw new Error('Erro ao carregar despesas');

      const data = await response.json();
      // API retorna array diretamente, não { data: [] }
      setExpenses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar despesas:', error);
    } finally {
      setLoadingExpenses(false);
    }
  };

  const handleSubmit = () => {
    const paymentData = {
      amount: parseFloat(amount),
      paymentDate,
      walletId,
      expenseId: expenseId || undefined,
    };
    onConfirm(paymentData);
  };

  // Quando selecionar uma despesa, preencher carteira e valor automaticamente
  const handleSelectExpense = (expense: Expense | null) => {
    if (expense) {
      setExpenseId(expense.id);
      setAmount(expense.amount.toFixed(2));
      if (expense.wallet?.id) {
        setWalletId(expense.wallet.id);
      }
    } else {
      setExpenseId('');
      setAmount(billAmount.toFixed(2));
    }
  };

  const filteredExpenses = expenses.filter((exp) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      exp.description.toLowerCase().includes(term) ||
      exp.category?.name.toLowerCase().includes(term) ||
      exp.amount.toString().includes(term)
    );
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <Modal open={open} onClose={onClose} title="💳 Registrar Pagamento da Fatura" size="lg">
      <div className="space-y-6">
        {/* Carteira */}
        <div>
          <Label htmlFor="wallet">Carteira para Pagamento</Label>
          <Select
            id="wallet"
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
            disabled={loading || loadingWallets}
          >
            <option value="">Selecione uma carteira</option>
            {wallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.name} ({wallet.type})
              </option>
            ))}
          </Select>
        </div>

        {/* Valor e Data do Pagamento */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="amount">Valor do Pagamento</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="paymentDate">Data do Pagamento</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Vincular a uma despesa existente */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Link className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Vincular a uma Despesa (Opcional)</h3>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Selecione uma despesa do mês para vincular este pagamento. Isso ajuda a rastrear de qual conta foi pago.
          </p>

          {/* Busca */}
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar despesa por descrição, categoria ou valor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                disabled={loadingExpenses}
              />
            </div>
          </div>

          {/* Lista de despesas */}
          {loadingExpenses ? (
            <div className="text-center py-8 text-gray-500">
              Carregando despesas...
            </div>
          ) : filteredExpenses.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2">
              <div
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  expenseId === '' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => handleSelectExpense(null)}
              >
                <p className="font-medium text-gray-700">Nenhuma (criar novo registro)</p>
                <p className="text-xs text-gray-500">O pagamento será registrado sem vincular a uma despesa existente</p>
              </div>

              {filteredExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    expenseId === expense.id ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={() => handleSelectExpense(expense)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{expense.description}</p>
                      <div className="flex gap-3 mt-1 text-xs text-gray-500">
                        <span>{formatDate(expense.date)}</span>
                        {expense.category && <span>• {expense.category.name}</span>}
                        {expense.wallet && <span>• {expense.wallet.name}</span>}
                      </div>
                    </div>
                    <p className="font-semibold text-red-600">{formatCurrency(expense.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'Nenhuma despesa encontrada com este critério' : 'Nenhuma despesa encontrada no mês'}
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !amount || !paymentDate || !walletId} 
            className="w-full sm:w-auto"
          >
            {loading ? 'Registrando...' : 'Registrar Pagamento'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
