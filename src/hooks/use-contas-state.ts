"use client";

import { useState, useEffect, useCallback } from 'react';

type Member = { id: number; name: string; phone?: string };
type BillShare = { memberId: number; type: 'value' | 'percent'; amount: number };
type Bill = { id: number; name: string; value: number; shares?: BillShare[] };
type Group = { id: number; name: string };

function parseLocaleNumber(v: string | number) {
  if (typeof v === 'number') return v;
  let s = String(v || '').trim();
  if (s === '') return 0;
  const hasDot = s.indexOf('.') !== -1;
  const hasComma = s.indexOf(',') !== -1;
  if (hasDot && hasComma) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    s = s.replace(',', '.');
  } else if (hasDot) {
    const dotCount = (s.match(/\./g) || []).length;
    if (dotCount > 1) s = s.replace(/\./g, '');
  }
  s = s.replace(/[^\d.-]/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function useContasState() {
  // Data states
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Add modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [name, setName] = useState<string>('');
  const [value, setValue] = useState<string>('');
  const [shareType, setShareType] = useState<'value' | 'percent'>('value');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [shares, setShares] = useState<Array<{ memberId: number; amount: string }>>([]);
  const [validationError, setValidationError] = useState('');

  // Edit modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [editName, setEditName] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editShareType, setEditShareType] = useState<'value' | 'percent'>('value');
  const [editSelectedMembers, setEditSelectedMembers] = useState<number[]>([]);
  const [editShares, setEditShares] = useState<Array<{ memberId: number; amount: string }>>([]);

  // Delete modal states
  const [confirmDeleteBill, setConfirmDeleteBill] = useState(false);

  // Helper function to get equal shares
  const getEqualShares = useCallback((type: "value" | "percent", value: string, members: number[]) => {
    if (!members.length) return [];
    if (type === "value") {
      const v = parseLocaleNumber(value) || 0;
      const base = Math.floor((v / members.length) * 100) / 100;
      const rest = v - base * members.length;
      return members.map((id, i) => ({ memberId: id, amount: (base + (i === 0 ? rest : 0)).toFixed(2) }));
    } else {
      const base = Math.floor((100 / members.length) * 100) / 100;
      const rest = 100 - base * members.length;
      return members.map((id, i) => ({ memberId: id, amount: (base + (i === 0 ? rest : 0)).toFixed(1) }));
    }
  }, []);

  // Fetch functions
  async function fetchGroups() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/controle-contas/grupos");
      const data = await res.json();
      setGroups(data);
    } catch {
      setError("Erro ao buscar grupos");
    } finally {
      setLoading(false);
    }
  }

  async function fetchMembers(groupId: number) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/controle-contas/membros?groupId=${groupId}`);
      const data = await res.json();
      setMembers(data);
    } catch {
      setError("Erro ao buscar membros");
    } finally {
      setLoading(false);
    }
  }

  async function fetchBills(groupId: number) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/controle-contas/contas?groupId=${groupId}`);
      const data = await res.json();
      setBills(data);
    } catch {
      setError("Erro ao buscar contas");
    } finally {
      setLoading(false);
    }
  }

  // Modal handlers
  function handleOpenAddModal() {
    setAddModalOpen(true);
    setName('');
    setValue('');
    setSelectedMembers([]);
    setShares(getEqualShares(shareType, '', members.map((m) => m.id)));
    setValidationError('');
  }

  function handleOpenEditModal(bill: Bill) {
    setSelectedBill(bill);
    setEditName(bill.name);
    setEditValue(String(bill.value));
    if (bill.shares && bill.shares.length > 0) {
      setEditShares(bill.shares.map(s => ({ memberId: s.memberId, amount: String(s.amount) })));
      setEditShareType(bill.shares[0].type);
      setEditSelectedMembers([]);
    } else {
      setEditShares(members.map(m => ({ memberId: m.id, amount: '' })));
      setEditSelectedMembers([]);
    }
    setEditModalOpen(true);
  }

  // Submit handlers
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setValidationError("");

    const ids = selectedMembers.length === 0 ? members.map((m) => m.id) : selectedMembers;
    
    if (shareType === "value") {
      const soma = ids.reduce((acc, id) => acc + parseLocaleNumber(shares.find((s) => s.memberId === id)?.amount ?? "0"), 0);
      const val = parseLocaleNumber(value);
      if (Math.abs(soma - val) > 0.01) {
        setValidationError("Soma dos valores não corresponde ao total");
        setLoading(false);
        return;
      }
    } else {
      const soma = ids.reduce((acc, id) => acc + parseLocaleNumber(shares.find((s) => s.memberId === id)?.amount ?? "0"), 0);
      if (Math.abs(soma - 100) > 0.1) {
        setValidationError("Soma das porcentagens deve ser 100%");
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch(`/api/controle-contas/contas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: selectedGroup,
          name,
          value: parseLocaleNumber(value),
          shares: ids.map(id => ({
            memberId: id,
            type: shareType,
            amount: parseLocaleNumber(shares.find(s => s.memberId === id)?.amount ?? "0")
          }))
        }),
      });
      if (!res.ok) throw new Error("Erro ao criar conta");
      setAddModalOpen(false);
      setToastMsg("Conta cadastrada!");
      if (selectedGroup) fetchBills(selectedGroup);
    } catch {
      setError("Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBill) return;
    setLoading(true);
    setError("");
    setValidationError("");

    const ids = editSelectedMembers.length === 0 ? members.map((m) => m.id) : editSelectedMembers;
    
    if (editShareType === "value") {
      const soma = ids.reduce((acc, id) => acc + parseLocaleNumber(editShares.find((s) => s.memberId === id)?.amount ?? "0"), 0);
      const val = parseLocaleNumber(editValue);
      if (Math.abs(soma - val) > 0.01) {
        setValidationError("Soma dos valores não corresponde ao total");
        setLoading(false);
        return;
      }
    } else {
      const soma = ids.reduce((acc, id) => acc + parseLocaleNumber(editShares.find((s) => s.memberId === id)?.amount ?? "0"), 0);
      if (Math.abs(soma - 100) > 0.1) {
        setValidationError("Soma das porcentagens deve ser 100%");
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch(`/api/controle-contas/contas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedBill.id,
          name: editName,
          value: parseLocaleNumber(editValue),
          shares: ids.map(id => ({
            memberId: id,
            type: editShareType,
            amount: parseLocaleNumber(editShares.find(s => s.memberId === id)?.amount ?? "0")
          }))
        }),
      });
      if (!res.ok) throw new Error("Erro ao editar conta");
      setEditModalOpen(false);
      setToastMsg("Conta editada!");
      if (selectedGroup) fetchBills(selectedGroup);
    } catch {
      setError("Erro ao editar conta");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!selectedBill) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/controle-contas/contas?id=${selectedBill.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir conta");
      setConfirmDeleteBill(false);
      setEditModalOpen(false);
      setSelectedBill(null);
      setToastMsg("Conta excluída!");
      if (selectedGroup) await fetchBills(selectedGroup);
    } catch {
      setError("Erro ao excluir conta");
    } finally {
      setLoading(false);
    }
  }

  // Effects
  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const groupIdParam = params.get("groupId");
      if (groupIdParam) {
        setSelectedGroup(Number(groupIdParam));
      }
    }
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchBills(selectedGroup);
      fetchMembers(selectedGroup);
    } else {
      setBills([]);
      setMembers([]);
    }
  }, [selectedGroup]);

  useEffect(() => {
    const ids = selectedMembers.length === 0 ? members.map((m) => m.id) : selectedMembers;
    setShares(getEqualShares(shareType, value, ids));
  }, [selectedMembers, value, shareType, members, getEqualShares]);

  useEffect(() => {
    const ids = editSelectedMembers.length === 0 ? members.map((m) => m.id) : editSelectedMembers;
    setEditShares(getEqualShares(editShareType, editValue, ids));
  }, [editValue, editSelectedMembers, editShareType, members, getEqualShares]);

  return {
    // Data
    groups,
    members,
    bills,
    selectedGroup,
    setSelectedGroup,

    // Loading
    loading,
    error,
    toastMsg,
    setToastMsg,

    // Add modal
    addModalOpen,
    setAddModalOpen,
    handleOpenAddModal,
    name,
    setName,
    value,
    setValue,
    shareType,
    setShareType,
    selectedMembers,
    setSelectedMembers,
    shares,
    setShares,
    validationError,
    handleSubmit,

    // Edit modal
    editModalOpen,
    setEditModalOpen,
    handleOpenEditModal,
    selectedBill,
    editName,
    setEditName,
    editValue,
    setEditValue,
    editShareType,
    setEditShareType,
    editSelectedMembers,
    setEditSelectedMembers,
    editShares,
    setEditShares,
    handleEdit,

    // Delete
    confirmDeleteBill,
    setConfirmDeleteBill,
    handleDelete,

    // Helpers
    getEqualShares,
    parseLocaleNumber,
  };
}
