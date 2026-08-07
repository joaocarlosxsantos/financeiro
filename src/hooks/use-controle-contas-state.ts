'use client';

import { useEffect, useMemo, useState } from 'react';

type BillCurrentCycle = { active: boolean; dueDate: string; paid: boolean; monthKey: string };

interface BillWithGroup {
  id: number;
  name: string;
  value: number;
  createdAt: string;
  paid?: boolean;
  scope: 'INDIVIDUAL' | 'SHARED';
  recurrence: 'PUNCTUAL' | 'RECURRING' | 'INSTALLMENT';
  installmentNumber?: number | null;
  installmentCount?: number | null;
  currentCycle?: BillCurrentCycle;
  group: { id: number; name: string } | null;
  shares?: { memberId: number; type: 'value' | 'percent'; amount: number }[];
}

interface Member {
  id: number;
  name: string;
  phone?: string;
}

type SharedBillWithGroup = Omit<BillWithGroup, 'group'> & { group: { id: number; name: string } };

interface GroupData {
  name: string;
  bills: SharedBillWithGroup[];
}

export function useControleContasState() {
  const [bills, setBills] = useState<BillWithGroup[]>([]);
  const [groupMembers, setGroupMembers] = useState<Record<number, Member[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchBills();
  }, []);

  async function fetchBills() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/controle-contas/contas');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erro');
      setBills(data);

      // Buscar membros completos de cada grupo (só contas compartilhadas têm grupo)
      const groupIds: number[] = Array.from(
        new Set(data.filter((b: BillWithGroup) => b.group).map((b: BillWithGroup) => b.group!.id))
      );
      const membersObj: Record<number, Member[]> = {};
      await Promise.all(
        groupIds.map(async (groupId) => {
          const res = await fetch(`/api/controle-contas/membros?groupId=${groupId}`);
          const members = await res.json();
          membersObj[groupId] = Array.isArray(members) ? members : [];
        })
      );
      setGroupMembers(membersObj);
    } catch {
      setError('Erro ao carregar contas');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return bills.filter(
      (b) => b.name.toLowerCase().includes(q) || (b.group?.name.toLowerCase().includes(q) ?? false)
    );
  }, [bills, query]);

  const sharedBills = useMemo(
    () => filtered.filter((b): b is SharedBillWithGroup => b.scope === 'SHARED' && !!b.group),
    [filtered]
  );
  const individualBills = useMemo(() => filtered.filter((b) => b.scope === 'INDIVIDUAL'), [filtered]);

  const total = useMemo(() => filtered.reduce((sum: number, b: BillWithGroup) => sum + b.value, 0), [filtered]);
  const individualTotal = useMemo(() => individualBills.reduce((sum, b) => sum + b.value, 0), [individualBills]);

  const groupsCount = useMemo(() => new Set(sharedBills.map((b) => b.group!.id)).size, [sharedBills]);

  const groupedData = useMemo(() => {
    return sharedBills.reduce((acc: Record<number, GroupData>, bill: SharedBillWithGroup) => {
      const groupId = bill.group.id;
      if (!acc[groupId]) acc[groupId] = { name: bill.group.name, bills: [] };
      acc[groupId].bills.push(bill);
      return acc;
    }, {} as Record<number, GroupData>);
  }, [sharedBills]);

  return {
    bills,
    groupMembers,
    loading,
    error,
    query,
    setQuery,
    filtered,
    sharedBills,
    individualBills,
    total,
    individualTotal,
    groupsCount,
    groupedData,
    fetchBills,
  };
}
