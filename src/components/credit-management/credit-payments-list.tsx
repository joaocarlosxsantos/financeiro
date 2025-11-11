'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Loader2, DollarSign, Receipt, Calendar, PlusCircle } from 'lucide-react';
import { PayBillModal } from '../ui/pay-bill-modal';
import { Select } from '../ui/select';
import { Label } from '../ui/label';

interface CreditPayment {
  id: string;
  billId: string;
  amount: number;
  paymentDate: string;
  walletId: string | null;
  bill: {
    id: string;
    month: number;
    year: number;
    creditCard: {
      id: string;
      name: string;
      bank: string;
    };
  };
  wallet?: {
    id: string;
    name: string;
  };
  createdAt: string;
}

interface CreditBill {
  id: string;
  dueDate: string;
  totalAmount: number;
  creditCard: {
    name: string;
  };
}

interface CreditPaymentsListProps {
  currentDate?: Date;
}

export default function CreditPaymentsList({ currentDate }: CreditPaymentsListProps) {
  const [payments, setPayments] = useState<CreditPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState<string>('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [pendingBills, setPendingBills] = useState<CreditBill[]>([]);

  useEffect(() => {
    const loadPayments = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/credit-bills/payments');
        
        if (!response.ok) {
          throw new Error('Erro ao carregar pagamentos');
        }

        const data = await response.json();
        let payments = Array.isArray(data) ? data : [];
        
        // Filtrar por mês se currentDate for fornecida
        if (currentDate) {
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth();
          payments = payments.filter((payment: CreditPayment) => {
            const paymentDate = new Date(payment.paymentDate);
            return paymentDate.getFullYear() === year && paymentDate.getMonth() === month;
          });
        }
        
        setPayments(payments);
      } catch (error) {
        console.error('Erro ao carregar pagamentos:', error);
        setError(error instanceof Error ? error.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    loadPayments();
    loadPendingBills();
  }, [currentDate, reloadKey]);

  const loadPendingBills = async () => {
    try {
      const response = await fetch('/api/credit-bills?status=PENDING');
      if (!response.ok) return;
      
      const data = await response.json();
      setPendingBills(data.data || []);
    } catch (error) {
      console.error('Erro ao carregar faturas pendentes:', error);
    }
  };

  const handleRegisterPayment = async (data: { amount: number; paymentDate: string; walletId: string; expenseId?: string }) => {
    if (!selectedBillId) return;

    setPaymentLoading(true);
    try {
      const response = await fetch(`/api/credit-bills/${selectedBillId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao registrar pagamento');
      }

      // Fechar modal e recarregar lista
      setPayModalOpen(false);
      setSelectedBillId('');
      reloadPayments();
      alert('Pagamento registrado com sucesso!');
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      alert(error instanceof Error ? error.message : 'Erro ao registrar pagamento. Tente novamente.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const reloadPayments = () => {
    setReloadKey(prev => prev + 1);
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

  const getMonthName = (month: number) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month - 1];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Carregando pagamentos...</span>
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
          onClick={reloadPayments}
          className="mt-2"
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (payments.length === 0 && pendingBills.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum pagamento registrado</h3>
          <p className="text-muted-foreground">
            Você ainda não registrou nenhum pagamento de fatura de cartão de crédito.
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedBill = pendingBills.find(b => b.id === selectedBillId);

  return (
    <div className="space-y-6">
      {/* Seção para registrar novo pagamento */}
      {pendingBills.length > 0 && (
        <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600 shadow-md">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900">
                    Registrar Novo Pagamento
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600 mt-1">
                    Selecione uma fatura pendente e registre o pagamento
                  </CardDescription>
                </div>
              </div>
              {pendingBills.length > 0 && (
                <Badge className="bg-blue-600 text-white px-3 py-1 text-sm">
                  {pendingBills.length} {pendingBills.length === 1 ? 'fatura pendente' : 'faturas pendentes'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div>
                <Label htmlFor="selectBill" className="text-sm font-semibold text-gray-700 mb-2 block">
                  Selecione a Fatura
                </Label>
                <Select
                  id="selectBill"
                  value={selectedBillId}
                  onChange={(e) => setSelectedBillId(e.target.value)}
                  className="w-full h-12 text-base border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                >
                  <option value="">Escolha uma fatura para pagar...</option>
                  {pendingBills.map((bill) => (
                    <option key={bill.id} value={bill.id}>
                      {bill.creditCard.name} • {formatCurrency(bill.totalAmount)} • Vence em {formatDate(bill.dueDate)}
                    </option>
                  ))}
                </Select>
              </div>

              {selectedBill && (
                <div className="p-4 bg-white rounded-lg border border-blue-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-700">Detalhes da Fatura</h4>
                    <Badge variant="outline" className="text-orange-600 border-orange-300">
                      Pendente
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Cartão</p>
                      <p className="font-semibold text-gray-900">{selectedBill.creditCard.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Valor Total</p>
                      <p className="font-bold text-lg text-red-600">{formatCurrency(selectedBill.totalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Vencimento</p>
                      <p className="font-semibold text-gray-900">{formatDate(selectedBill.dueDate)}</p>
                    </div>
                    <div className="flex items-end justify-end">
                      <Button
                        onClick={() => setPayModalOpen(true)}
                        disabled={!selectedBillId}
                        size="lg"
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all h-11 px-6"
                      >
                        <DollarSign className="h-5 w-5 mr-2" />
                        Registrar Pagamento
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {!selectedBill && (
                <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-dashed border-gray-300">
                  <Receipt className="h-5 w-5 text-gray-400" />
                  <p className="text-sm text-gray-500">
                    Selecione uma fatura acima para visualizar os detalhes e registrar o pagamento
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de pagamentos já registrados */}
      {payments.length > 0 && (
        <>
          <div className="flex items-center gap-2 pt-4">
            <Receipt className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Histórico de Pagamentos</h3>
          </div>
          {payments.map((payment) => (
        <Card key={payment.id}>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">
                  Pagamento de {formatCurrency(payment.amount)}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Receipt className="h-4 w-4" />
                  Fatura {getMonthName(payment.bill.month)} {payment.bill.year} - {payment.bill.creditCard.name}
                </CardDescription>
              </div>
              <Badge className="bg-green-100 text-green-800">
                Pago
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Valor Pago</p>
                <p className="font-semibold text-lg text-green-700">{formatCurrency(payment.amount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Data do Pagamento</p>
                <p className="font-semibold">{formatDate(payment.paymentDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cartão</p>
                <p className="font-semibold">
                  {payment.bill.creditCard.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {payment.bill.creditCard.bank}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Carteira</p>
                <p className="font-semibold">
                  {payment.wallet ? payment.wallet.name : 'Não especificada'}
                </p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Registrado em {formatDate(payment.createdAt)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
        </>
      )}

      {/* Modal de pagamento */}
      {selectedBill && (
        <PayBillModal
          open={payModalOpen}
          onClose={() => {
            setPayModalOpen(false);
          }}
          onConfirm={handleRegisterPayment}
          billAmount={selectedBill.totalAmount}
          billDueDate={selectedBill.dueDate}
          loading={paymentLoading}
        />
      )}
    </div>
  );
}