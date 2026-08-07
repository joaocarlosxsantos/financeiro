// Tipos compartilhados para o módulo Controle de Contas
export interface Share {
  memberId: number;
  type: 'value' | 'percent';
  amount: number;
}

export type BillScope = 'INDIVIDUAL' | 'SHARED';
export type BillRecurrence = 'PUNCTUAL' | 'RECURRING' | 'INSTALLMENT';

export interface BillCurrentCycle {
  active: boolean;
  dueDate: string | Date;
  paid: boolean;
  monthKey: string;
}

export interface BillWithGroup {
  id: number;
  name: string;
  title?: string;
  description?: string;
  value: number;
  amount?: number | string;
  createdAt?: string;
  dueDate?: string | null;
  paid?: boolean;
  scope: BillScope;
  recurrence: BillRecurrence;
  endDate?: string | null;
  excludedDates?: string[];
  paidMonths?: string[];
  installmentGroupId?: string | null;
  installmentNumber?: number | null;
  installmentCount?: number | null;
  currentCycle?: BillCurrentCycle;
  group: { id: number; name: string } | null;
  shares?: Share[];
}

export interface Member {
  id: number;
  name: string;
  phone?: string | null;
  groupId?: number | null;
}

export interface GroupSummary {
  id: number;
  name: string;
  createdAt?: string;
  description?: string | null;
  membersCount?: number;
}
