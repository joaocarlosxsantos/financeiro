'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Loader2, Receipt, DollarSign, Calendar, Eye } from 'lucide-react';

interface CreditBill {
  id: string;
  creditCardId: string;
  month: number;
  year: number;
  dueDate: string;
  closingDate: string;
  totalAmount: number;
  status: 'OPEN' | 'CLOSED' | 'PAID' | 'OVERDUE';
  creditCard: {
    id: string;
    name: string;
    bank: string;
  };
  items: {
    id: string;
    description: string;
    amount: number;
    installmentNumber: number;
    totalInstallments: number;
  }[];
  payments: {
    id: string;
    amount: number;
    paymentDate: string;
  }[];
  createdAt: string;
}

export default function CreditBillsList() {
  const [bills, setBills] = useState<CreditBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedBill, setExpandedBill] = useState<string | null>(null);

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🧾 Carregando faturas...');
      const response = await fetch('/api/credit-bills');
      
      if (!response.ok) {
        console.error('❌ Erro HTTP faturas:', response.status, response.statusText);
        throw new Error('Erro ao carregar faturas');
      }

      const data = await response.json();
      console.log('📋 Faturas recebidas da API:', data);
      setBills(data.data && Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      console.error('Erro ao carregar faturas:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const payBill = async (billId: string, amount: number) => {
    const paymentDate = prompt('Data do pagamento (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
    if (!paymentDate) return;

    try {
      const response = await fetch(`/api/credit-bills/${billId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          paymentDate,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao registrar pagamento');
      }

      // Recarregar a lista
      await loadBills();
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      alert('Erro ao registrar pagamento. Tente novamente.');
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

  const getStatusBadge = (status: CreditBill['status']) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="secondary">Aberta</Badge>;
      case 'CLOSED':
        return <Badge variant="outline">Fechada</Badge>;
      case 'PAID':
        return <Badge className="bg-green-100 text-green-800">Paga</Badge>;
      case 'OVERDUE':
        return <Badge variant="destructive">Vencida</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
        <span className="ml-2">Carregando faturas...</span>
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
          onClick={loadBills}
          className="mt-2"
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (bills.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma fatura encontrada</h3>
          <p className="text-muted-foreground">
            Não há faturas geradas ainda. As faturas são criadas automaticamente quando há gastos no cartão.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {(bills || []).map((bill) => (
        <Card key={bill.id}>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">
                  Fatura {getMonthName(bill.month)} {bill.year}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Receipt className="h-4 w-4" />
                  {bill.creditCard.name} - {bill.creditCard.bank}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(bill.status)}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpandedBill(expandedBill === bill.id ? null : bill.id)}
                >
                  <Eye className="h-4 w-4" />
                  {expandedBill === bill.id ? 'Ocultar' : 'Detalhes'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Valor Total</p>
                <p className="font-semibold text-lg">{formatCurrency(bill.totalAmount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Vencimento</p>
                <p className="font-semibold">{formatDate(bill.dueDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Fechamento</p>
                <p className="font-semibold">{formatDate(bill.closingDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Itens</p>
                <p className="font-semibold">{bill.items.length} compra(s)</p>
              </div>
            </div>

            {bill.status === 'CLOSED' && (
              <div className="mt-4">
                <Button
                  onClick={() => payBill(bill.id, bill.totalAmount)}
                  className="flex items-center gap-2"
                  size="sm"
                >
                  <DollarSign className="h-4 w-4" />
                  Registrar Pagamento
                </Button>
              </div>
            )}

            {expandedBill === bill.id && (
              <div className="mt-6 pt-4 border-t">
                <h4 className="font-semibold mb-3">Itens da Fatura</h4>
                {bill.items.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhum item nesta fatura.</p>
                ) : (
                  <div className="space-y-2">
                    {bill.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                        <div>
                          <p className="font-medium">{item.description}</p>
                          <p className="text-xs text-muted-foreground">
                            Parcela {item.installmentNumber} de {item.totalInstallments}
                          </p>
                        </div>
                        <p className="font-semibold">{formatCurrency(item.amount)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {bill.payments.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-3">Pagamentos</h4>
                    <div className="space-y-2">
                      {bill.payments.map((payment) => (
                        <div key={payment.id} className="flex justify-between items-center p-2 bg-green-50 rounded">
                          <p className="text-sm">Pagamento em {formatDate(payment.paymentDate)}</p>
                          <p className="font-semibold text-green-700">{formatCurrency(payment.amount)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}