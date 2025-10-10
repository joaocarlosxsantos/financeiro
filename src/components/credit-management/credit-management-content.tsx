'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Modal } from '../ui/modal';
import { useMonth } from '@/components/providers/month-provider';
import { PlusCircle, CreditCard, Receipt, DollarSign, ArrowLeft, ArrowRight, Calendar } from 'lucide-react';
import CreditExpenseForm from './credit-expense-form';
import CreditExpensesList from './credit-expenses-list';
import CreditBillsList from './credit-bills-list';
import CreditPaymentsList from './credit-payments-list';

export default function CreditManagementContent() {
  const [activeTab, setActiveTab] = useState('expenses');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { currentDate, setCurrentDate } = useMonth();

  // Navegação de mês
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

  const handleEditExpense = (expenseId: string) => {
    setEditingExpenseId(expenseId);
    setShowExpenseForm(true);
  };

  const handleCloseForm = () => {
    setShowExpenseForm(false);
    setEditingExpenseId(null);
  };

  const handleFormSuccess = () => {
    console.log('✅ Gasto salvo com sucesso! Recarregando lista...');
    handleCloseForm();
    setRefreshKey(prev => prev + 1); // Força reload da lista
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gestão de Cartão de Crédito</h1>
        <p className="text-muted-foreground">Gerencie gastos parcelados, faturas e pagamentos do cartão de crédito</p>
      </div>

      {/* Seletor de Mês */}
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
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Gastos
          </TabsTrigger>
          <TabsTrigger value="bills" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Faturas
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Pagamentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Gastos no Cartão de Crédito</h3>
              <p className="text-sm text-muted-foreground">
                Registre compras à vista ou parceladas no cartão de crédito
              </p>
            </div>
            <Button 
              onClick={() => setShowExpenseForm(true)}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Nova Compra
            </Button>
          </div>

          <CreditExpensesList key={refreshKey} onEdit={handleEditExpense} currentDate={currentDate} />
        </TabsContent>

        <TabsContent value="bills" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Faturas do Cartão</h3>
            <p className="text-sm text-muted-foreground">
              Visualize e gerencie as faturas mensais do cartão de crédito
            </p>
          </div>
          <CreditBillsList key={refreshKey} currentDate={currentDate} />
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Pagamentos de Fatura</h3>
            <p className="text-sm text-muted-foreground">
              Histórico de pagamentos das faturas do cartão de crédito
            </p>
          </div>
          <CreditPaymentsList currentDate={currentDate} />
        </TabsContent>
      </Tabs>

      {/* Modal do formulário de gastos */}
      {showExpenseForm && (
        <Modal
          open={showExpenseForm}
          onClose={handleCloseForm}
          title={editingExpenseId ? "Editar Compra no Cartão" : "Nova Compra no Cartão"}
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {editingExpenseId 
                ? "Edite os dados da compra no cartão de crédito" 
                : "Registre uma nova compra no cartão de crédito, podendo dividir em até 12x"}
            </p>
            <CreditExpenseForm 
              expenseId={editingExpenseId || undefined}
              onSuccess={handleFormSuccess}
              onCancel={handleCloseForm}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}