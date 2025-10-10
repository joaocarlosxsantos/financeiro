'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Loader2, DollarSign, Receipt, Calendar } from 'lucide-react';

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

interface CreditPaymentsListProps {
  currentDate?: Date;
}

export default function CreditPaymentsList({ currentDate }: CreditPaymentsListProps) {
  const [payments, setPayments] = useState<CreditPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

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
  }, [currentDate, reloadKey]);

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

  if (payments.length === 0) {
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

  return (
    <div className="space-y-4">
      {(payments || []).map((payment) => (
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
    </div>
  );
}