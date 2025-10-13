'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { AlertTriangle, Calculator, CreditCard } from 'lucide-react';
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
  };
  category?: {
    id: string;
    name: string;
  };
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
}

interface RefundDialogProps {
  expense: CreditExpense | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RefundDialog({ expense, open, onClose, onSuccess }: RefundDialogProps) {
  const [refundType, setRefundType] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [partialAmount, setPartialAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Estados calculados
  const [refundAnalysis, setRefundAnalysis] = useState<{
    totalAmount: number;
    paidInstallments: number;
    pendingInstallments: number;
    paidAmount: number;
    pendingAmount: number;
    canFullRefund: boolean;
    maxPartialRefund: number;
  } | null>(null);

  useEffect(() => {
    if (!expense) {
      setRefundAnalysis(null);
      return;
    }

    // Analisar situação das parcelas
    let paidInstallments = 0;
    let paidAmount = 0;
    let pendingAmount = 0;

    for (const item of expense.billItems || []) {
      if (item.bill?.status === 'PAID') {
        paidInstallments++;
        paidAmount += Number(item.amount) || 0;
      } else {
        pendingAmount += Number(item.amount) || 0;
      }
    }

    const pendingInstallments = expense.installments - paidInstallments;
    const canFullRefund = paidInstallments === 0;
    const maxPartialRefund = paidInstallments > 0 ? paidAmount : (Number(expense.amount) || 0);

    setRefundAnalysis({
      totalAmount: Number(expense.amount) || 0,
      paidInstallments,
      pendingInstallments,
      paidAmount: Number(Number(paidAmount || 0).toFixed(2)),
      pendingAmount: Number(Number(pendingAmount || 0).toFixed(2)),
      canFullRefund,
      maxPartialRefund: Number(Number(maxPartialRefund || 0).toFixed(2))
    });

    // Resetar form
    setRefundType(canFullRefund ? 'FULL' : 'PARTIAL');
    setPartialAmount('');
    setErrors({});
  }, [expense]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (refundType === 'PARTIAL') {
      const amount = parseFloat(partialAmount);
      if (!partialAmount || isNaN(amount) || amount <= 0) {
        newErrors.partialAmount = 'Valor deve ser maior que zero';
      } else if (refundAnalysis && amount > refundAnalysis.maxPartialRefund) {
        newErrors.partialAmount = `Valor máximo para estorno: ${formatCurrency(refundAnalysis.maxPartialRefund)}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRefund = async () => {
    if (!expense || !refundAnalysis || !validateForm()) return;

    setLoading(true);
    try {
      const refundAmount = refundType === 'FULL' 
        ? Number(refundAnalysis.totalAmount.toFixed(2))
        : Number(parseFloat(partialAmount).toFixed(2));



      const response = await fetch(`/api/credit-expenses/${expense.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refundType,
          amount: refundAmount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setErrors({ general: errorData.error || 'Erro ao processar estorno' });
        return;
      }

      onSuccess();
      onClose();
    } catch (error) {
      setErrors({ general: 'Erro interno do servidor' });
    } finally {
      setLoading(false);
    }
  };

  if (!expense || !refundAnalysis) {
    return null;
  }

  return (
    <Modal open={open} onClose={onClose} title="Estornar Compra">
      <div className="space-y-6">
        {/* Informações da compra */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Detalhes da Compra
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Descrição:</span>
              <span className="text-sm font-medium">{expense.description}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Valor Total:</span>
              <span className="text-sm font-semibold text-red-600">
                {formatCurrency(expense.amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Parcelas:</span>
              <span className="text-sm">
                {expense.installments}x de {formatCurrency(expense.amount / expense.installments)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Data da Compra:</span>
              <span className="text-sm">{formatDate(expense.purchaseDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Cartão:</span>
              <Badge variant="secondary" className="text-xs">
                {expense.creditCard.name}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Análise das parcelas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Situação das Parcelas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Parcelas Pagas:</span>
              <span className="text-sm font-medium text-green-600">
                {refundAnalysis.paidInstallments} ({formatCurrency(refundAnalysis.paidAmount)})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Parcelas Pendentes:</span>
              <span className="text-sm font-medium text-yellow-600">
                {refundAnalysis.pendingInstallments} ({formatCurrency(refundAnalysis.pendingAmount)})
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Opções de estorno */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Tipo de Estorno</Label>
          
          {/* Estorno Completo */}
          <div className="space-y-2">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="refundType"
                value="FULL"
                checked={refundType === 'FULL'}
                onChange={(e) => setRefundType(e.target.value as 'FULL')}
                disabled={!refundAnalysis.canFullRefund}
                className="h-4 w-4"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Estorno Completo</span>
                  {refundAnalysis.canFullRefund && (
                    <Badge variant="default" className="text-xs">Recomendado</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Estorna todo o valor da compra ({formatCurrency(refundAnalysis.totalAmount)})
                </p>
                {!refundAnalysis.canFullRefund && (
                  <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                    <AlertTriangle className="h-3 w-3" />
                    Não disponível - algumas parcelas já foram pagas
                  </p>
                )}
              </div>
            </label>
          </div>

          {/* Estorno Parcial */}
          <div className="space-y-2">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="refundType"
                value="PARTIAL"
                checked={refundType === 'PARTIAL'}
                onChange={(e) => setRefundType(e.target.value as 'PARTIAL')}
                className="h-4 w-4"
              />
              <div className="flex-1">
                <span className="font-medium">Estorno Parcial</span>
                <p className="text-sm text-muted-foreground">
                  Estorna apenas parte do valor da compra
                </p>
              </div>
            </label>

            {refundType === 'PARTIAL' && (
              <div className="ml-7 space-y-2">
                <Label htmlFor="partialAmount">Valor do Estorno</Label>
                <Input
                  id="partialAmount"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  className={errors.partialAmount ? 'border-red-500' : ''}
                />
                {errors.partialAmount && (
                  <p className="text-red-500 text-xs">{errors.partialAmount}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Máximo: {formatCurrency(refundAnalysis.maxPartialRefund)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Informações do que acontecerá */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <h4 className="font-medium text-blue-900 mb-2">O que acontecerá:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              {refundType === 'FULL' ? (
                <>
                  <li>• Uma transação de estorno será criada</li>
                  <li>• Todas as parcelas pendentes serão canceladas</li>
                  <li>• O estorno aparecerá como crédito nas próximas faturas</li>
                </>
              ) : (
                <>
                  <li>• Uma transação de estorno parcial será criada</li>
                  <li>• O valor será aplicado como crédito nas próximas faturas</li>
                  <li>• As parcelas restantes continuarão normalmente</li>
                </>
              )}
            </ul>
          </CardContent>
        </Card>

        {/* Erro geral */}
        {errors.general && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
            <p><strong>Erro:</strong> {errors.general}</p>
          </div>
        )}

        {/* Botões */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleRefund} disabled={loading}>
            {loading ? 'Processando...' : 'Confirmar Estorno'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}