'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, FileText } from 'lucide-react';

interface ControleContasCardsProps {
  groupsCount: number;
  total: number;
  billsCount: number;
}

export function ControleContasCards({ groupsCount, total, billsCount }: ControleContasCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Total de Grupos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Grupos</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{groupsCount}</div>
          <p className="text-xs text-muted-foreground">
            {groupsCount === 1 ? 'grupo cadastrado' : 'grupos cadastrados'}
          </p>
        </CardContent>
      </Card>

      {/* Valor Total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <p className="text-xs text-muted-foreground">
            soma de todas as contas
          </p>
        </CardContent>
      </Card>

      {/* Total de Contas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Contas</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{billsCount}</div>
          <p className="text-xs text-muted-foreground">
            {billsCount === 1 ? 'conta cadastrada' : 'contas cadastradas'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
