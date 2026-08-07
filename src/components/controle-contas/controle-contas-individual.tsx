'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Repeat, Layers, CheckCircle2, Circle } from 'lucide-react';

interface BillCurrentCycle {
  active: boolean;
  dueDate: string;
  paid: boolean;
  monthKey: string;
}

interface BillWithGroup {
  id: number;
  name: string;
  value: number;
  paid?: boolean;
  recurrence: 'PUNCTUAL' | 'RECURRING' | 'INSTALLMENT';
  installmentNumber?: number | null;
  installmentCount?: number | null;
  currentCycle?: BillCurrentCycle;
}

interface ControleContasIndividualProps {
  bills: BillWithGroup[];
  loading: boolean;
}

export function ControleContasIndividual({ bills, loading }: ControleContasIndividualProps) {
  if (loading) return null;

  if (bills.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma conta individual cadastrada.</p>
            <p className="text-sm mt-2">Contas individuais não são divididas com ninguém.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {bills.map((bill) => {
        const isPaid = bill.recurrence === 'RECURRING' ? !!bill.currentCycle?.paid : !!bill.paid;
        return (
          <Card
            key={bill.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => (window.location.href = `/controle-contas/contas?view=individual`)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                {bill.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xl font-bold text-primary">
                {bill.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {bill.recurrence === 'RECURRING' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-medium px-2 py-0.5">
                    <Repeat className="w-3 h-3" /> Recorrente
                  </span>
                )}
                {bill.recurrence === 'INSTALLMENT' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-medium px-2 py-0.5">
                    <Layers className="w-3 h-3" /> Parcela {bill.installmentNumber}/{bill.installmentCount}
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 rounded-full text-xs font-medium px-2 py-0.5 ${
                    isPaid ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                  {isPaid ? 'Paga' : 'Pendente'}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
