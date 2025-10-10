'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Modal } from '../ui/modal';
import { PlusCircle, CreditCard, Receipt, DollarSign } from 'lucide-react';
import CreditExpenseForm from './credit-expense-form';
import CreditExpensesList from './credit-expenses-list';
import CreditBillsList from './credit-bills-list';
import CreditPaymentsList from './credit-payments-list';

export default function CreditManagementContent() {
  const [activeTab, setActiveTab] = useState('expenses');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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

          <CreditExpensesList key={refreshKey} onEdit={handleEditExpense} />
        </TabsContent>

        <TabsContent value="bills" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Faturas do Cartão</h3>
            <p className="text-sm text-muted-foreground">
              Visualize e gerencie as faturas mensais do cartão de crédito
            </p>
          </div>
          <CreditBillsList key={refreshKey} />
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Pagamentos de Fatura</h3>
            <p className="text-sm text-muted-foreground">
              Histórico de pagamentos das faturas do cartão de crédito
            </p>
          </div>
          <CreditPaymentsList />
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