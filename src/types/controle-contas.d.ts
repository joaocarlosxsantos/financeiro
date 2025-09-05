// Tipos compartilhados para o módulo Controle de Contas
export interface Share {
  memberId: number;
  type: 'value' | 'percent';
  amount: number;
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
  group: { id: number; name: string };
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
