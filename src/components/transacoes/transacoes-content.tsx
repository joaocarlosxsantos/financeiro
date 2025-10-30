'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useMonth } from '@/components/providers/month-provider';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Calendar, TrendingDown, TrendingUp, DollarSign, Plus } from 'lucide-react';
import { TransactionFormModal } from '@/components/transacoes/transaction-form-modal';
import { useCategoriesAndWallets } from '@/hooks/use-categories-wallets';
import { ExpandedTransactionsTable } from '@/components/transacoes/expanded-transactions-table';
import { formatCurrency, formatYmd } from '@/lib/utils';

export default function TransacoesContent() {
  const [reloadFlag, setReloadFlag] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const { categories, wallets, loading } = useCategoriesAndWallets();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl === 'ganhos' ? 'ganhos' : 'gastos');
  const { currentDate, setCurrentDate } = useMonth();
  const [summary, setSummary] = useState({
    totalGastos: 0,
    totalGanhos: 0,
    saldo: 0,
    isLoading: true
  });

  // Navegação de mês global
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    const now = new Date();
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    if (nextMonth <= now) {
      setCurrentDate(nextMonth);
    }
  };

  const monthLabel = currentDate.toLocaleString('pt-BR', { month: 'long' });
  const monthLabelCapitalized = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  const yearLabel = currentDate.getFullYear();
  const today = new Date().toISOString().slice(0, 10);

  // Carregar resumo das transações
  useEffect(() => {
    function handleReloadSummary() {
      setReloadFlag(f => f + 1);
    }
    window.addEventListener('transactions:reloadSummary', handleReloadSummary);

    async function loadSummary() {
      setSummary(prev => ({ ...prev, isLoading: true }));
      
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const start = formatYmd(new Date(year, month, 1));
      const end = formatYmd(new Date(year, month + 1, 0));

      try {
        const [expensesVar, expensesFix, incomesVar, incomesFix] = await Promise.all([
          fetch(`/api/expenses?type=PUNCTUAL&start=${start}&end=${end}&perPage=200`, { cache: 'no-store' }),
          fetch(`/api/expenses?type=RECURRING&start=${start}&end=${end}&perPage=200`, { cache: 'no-store' }),
          fetch(`/api/incomes?type=PUNCTUAL&start=${start}&end=${end}&perPage=200`, { cache: 'no-store' }),
          fetch(`/api/incomes?type=RECURRING&start=${start}&end=${end}&perPage=200`, { cache: 'no-store' })
        ]);

        let totalGastos = 0;
        let totalGanhos = 0;

        if (expensesVar.ok) {
          const data = await expensesVar.json();
          totalGastos += data.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
        }
        
        if (expensesFix.ok) {
          const data = await expensesFix.json();
          totalGastos += data.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
        }

        if (incomesVar.ok) {
          const data = await incomesVar.json();
          totalGanhos += data.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
        }
        
        if (incomesFix.ok) {
          const data = await incomesFix.json();
          totalGanhos += data.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
        }

        setSummary({
          totalGastos,
          totalGanhos,
          saldo: totalGanhos - totalGastos,
          isLoading: false
        });

      } catch (error) {
        console.error('Erro ao carregar resumo:', error);
        setSummary(prev => ({ ...prev, isLoading: false }));
      }
    }

    loadSummary();
    return () => {
      window.removeEventListener('transactions:reloadSummary', handleReloadSummary);
    };
  }, [currentDate, reloadFlag]);

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Transações</h1>
        <p className="text-muted-foreground">Gerencie seus gastos e ganhos em um só lugar</p>
      </div>

      {/* Header com navegação de mês */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevMonth}
            aria-label="Mês anterior"
            className="h-10 w-10 rounded-full border border-slate-300/60 dark:border-white/15 bg-white/40 dark:bg-slate-700/40 hover:bg-white/60 dark:hover:bg-slate-700/60 shadow-sm backdrop-blur-sm"
          >
            <ArrowLeft className="h-5 w-5 stroke-[2.5] text-slate-700 dark:text-slate-200" />
          </Button>
          <div className="flex items-center space-x-2 px-3 h-10 rounded-md border bg-white/90 border-slate-300/70 text-slate-900 shadow-sm backdrop-blur-sm dark:bg-slate-800/60 dark:border-white/15 dark:text-slate-100">
            <Calendar className="h-4 w-4 text-slate-700 dark:text-slate-200" />
            <span className="font-medium text-sm sm:text-base">{monthLabelCapitalized} {yearLabel}</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextMonth}
            aria-label="Próximo mês"
            className="h-10 w-10 rounded-full border border-slate-300/60 dark:border-white/15 bg-white/40 dark:bg-slate-700/40 hover:bg-white/60 dark:hover:bg-slate-700/60 shadow-sm backdrop-blur-sm"
          >
            <ArrowRight className="h-5 w-5 stroke-[2.5] text-slate-700 dark:text-slate-200" />
          </Button>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Transação
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Ganhos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summary.isLoading ? '...' : formatCurrency(summary.totalGanhos)}
            </div>
            <p className="text-xs text-muted-foreground">
              {monthLabelCapitalized} {yearLabel}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Gastos</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summary.isLoading ? '...' : formatCurrency(summary.totalGastos)}
            </div>
            <p className="text-xs text-muted-foreground">
              {monthLabelCapitalized} {yearLabel}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo do Mês</CardTitle>
            <DollarSign className={`h-4 w-4 ${summary.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary.isLoading ? '...' : formatCurrency(summary.saldo)}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.saldo >= 0 ? 'Superávit' : 'Déficit'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="gastos" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Gastos
          </TabsTrigger>
          <TabsTrigger value="ganhos" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Ganhos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gastos" className="space-y-4">
          <ExpandedTransactionsTable
            transactionType="expense"
            from={formatYmd(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1))}
            to={formatYmd(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0))}
            currentDate={currentDate}
            reloadFlag={reloadFlag}
          />
        </TabsContent>

        <TabsContent value="ganhos" className="space-y-4">
          <ExpandedTransactionsTable
            transactionType="income"
            from={formatYmd(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1))}
            to={formatYmd(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0))}
            currentDate={currentDate}
            reloadFlag={reloadFlag}
          />
        </TabsContent>
      </Tabs>
      {/* Modal de criar transação */}
      <TransactionFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={async (form) => {
          // Monta payload
          const payload = {
            description: form.description,
            amount: Number(form.amount),
            date: form.date,
            categoryId: form.categoryId,
            walletId: form.walletId,
            type: form.recurring ? 'RECURRING' : 'PUNCTUAL',
            recurringStart: form.recurring ? form.recurringStart : undefined,
            recurringEnd: form.recurring ? form.recurringEnd : undefined,
          };
          const url = form.type === 'income' ? '/api/incomes' : '/api/expenses';
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            setShowForm(false);
            setReloadFlag(f => f + 1);
          } else {
            alert('Erro ao salvar transação');
          }
        }}
        title="Nova Transação"
        categories={categories}
        wallets={wallets}
      />
    </div>
  );
}