'use client';

import { useEffect, useMemo, useState } from 'react';

interface BillWithGroup {
  id: number;
  name: string;
  value: number;
  createdAt: string;
  group: { id: number; name: string };
  shares?: { memberId: number; type: 'value' | 'percent'; amount: number }[];
}

interface Member {
  id: number;
  name: string;
  phone?: string;
}

interface GroupData {
  name: string;
  bills: BillWithGroup[];
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
      
      // Buscar membros completos de cada grupo
      const groupIds: number[] = Array.from(new Set(data.map((b: BillWithGroup) => b.group.id)));
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
    return bills.filter(b => b.name.toLowerCase().includes(q) || b.group.name.toLowerCase().includes(q));
  }, [bills, query]);

  const total = useMemo(() => bills.reduce((sum: number, b: any) => sum + b.value, 0), [bills]);
  
  const groupsCount = useMemo(() => new Set(bills.map(b => b.group.id)).size, [bills]);

  const groupedData = useMemo(() => {
    return filtered.reduce((acc: Record<number, GroupData>, bill: BillWithGroup) => {
      const groupId = bill.group.id;
      if (!acc[groupId]) acc[groupId] = { name: bill.group.name, bills: [] };
      acc[groupId].bills.push(bill);
      return acc;
    }, {} as Record<number, GroupData>);
  }, [filtered]);

  return {
    bills,
    groupMembers,
    loading,
    error,
    query,
    setQuery,
    filtered,
    total,
    groupsCount,
    groupedData,
    fetchBills,
  };
}
