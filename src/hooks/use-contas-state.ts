"use client";

import { useState, useEffect, useCallback } from 'react';

type Member = { id: number; name: string; phone?: string };
type BillShare = { memberId: number; type: 'value' | 'percent'; amount: number };
type BillScope = 'INDIVIDUAL' | 'SHARED';
type BillRecurrence = 'PUNCTUAL' | 'RECURRING' | 'INSTALLMENT';
type BillCurrentCycle = { active: boolean; dueDate: string; paid: boolean; monthKey: string };
type Bill = {
  id: number;
  name: string;
  value: number;
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
  shares?: BillShare[];
};
type Group = { id: number; name: string };
export type ViewMode = 'shared' | 'individual';

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

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function useContasState() {
  // View mode: contas compartilhadas (por grupo) vs contas individuais
  const [viewMode, setViewMode] = useState<ViewMode>('shared');

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
  const [dueDate, setDueDate] = useState<string>(todayInputValue());
  const [recurrence, setRecurrence] = useState<BillRecurrence>('PUNCTUAL');
  const [endDate, setEndDate] = useState<string>('');
  const [installmentCount, setInstallmentCount] = useState<string>('2');
  const [paid, setPaid] = useState(false);
  const [shareType, setShareType] = useState<'value' | 'percent'>('value');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [shares, setShares] = useState<Array<{ memberId: number; amount: string }>>([]);
  const [validationError, setValidationError] = useState('');

  // Edit modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [editName, setEditName] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editRecurrence, setEditRecurrence] = useState<BillRecurrence>('PUNCTUAL');
  const [editEndDate, setEditEndDate] = useState('');
  const [editPaid, setEditPaid] = useState(false);
  const [editShareType, setEditShareType] = useState<'value' | 'percent'>('value');
  const [editSelectedMembers, setEditSelectedMembers] = useState<number[]>([]);
  const [editShares, setEditShares] = useState<Array<{ memberId: number; amount: string }>>([]);

  // Delete modal states
  const [confirmDeleteBill, setConfirmDeleteBill] = useState(false);
  const [installmentDeleteOpen, setInstallmentDeleteOpen] = useState(false);

  function openDeleteConfirm() {
    if (selectedBill?.recurrence === 'INSTALLMENT') {
      setInstallmentDeleteOpen(true);
    } else {
      setConfirmDeleteBill(true);
    }
  }

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

  async function fetchIndividualBills() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/controle-contas/contas?scope=individual`);
      const data = await res.json();
      setBills(data);
    } catch {
      setError("Erro ao buscar contas individuais");
    } finally {
      setLoading(false);
    }
  }

  // Modal handlers
  function handleOpenAddModal() {
    setAddModalOpen(true);
    setName('');
    setValue('');
    setDueDate(todayInputValue());
    setRecurrence('PUNCTUAL');
    setEndDate('');
    setInstallmentCount('2');
    setPaid(false);
    setSelectedMembers([]);
    setShares(getEqualShares(shareType, '', members.map((m) => m.id)));
    setValidationError('');
  }

  function handleOpenEditModal(bill: Bill) {
    setSelectedBill(bill);
    setEditName(bill.name);
    setEditValue(String(bill.value));
    setEditDueDate(bill.dueDate ? new Date(bill.dueDate).toISOString().slice(0, 10) : todayInputValue());
    setEditRecurrence(bill.recurrence);
    setEditEndDate(bill.endDate ? new Date(bill.endDate).toISOString().slice(0, 10) : '');
    setEditPaid(!!bill.paid);
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

    const isShared = viewMode === 'shared';
    const ids = selectedMembers.length === 0 ? members.map((m) => m.id) : selectedMembers;

    if (isShared) {
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
    }

    try {
      const res = await fetch(`/api/controle-contas/contas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: isShared ? 'SHARED' : 'INDIVIDUAL',
          groupId: isShared ? selectedGroup : undefined,
          title: name,
          amount: parseLocaleNumber(value),
          dueDate: new Date(dueDate).toISOString(),
          recurrence,
          endDate: recurrence === 'RECURRING' && endDate ? new Date(endDate).toISOString() : undefined,
          installmentCount: recurrence === 'INSTALLMENT' ? Number(installmentCount) : undefined,
          paid,
          shares: isShared ? ids.map(id => ({
            memberId: id,
            type: shareType,
            amount: parseLocaleNumber(shares.find(s => s.memberId === id)?.amount ?? "0")
          })) : undefined,
        }),
      });
      if (!res.ok) throw new Error("Erro ao criar conta");
      setAddModalOpen(false);
      setToastMsg(recurrence === 'INSTALLMENT' ? `${installmentCount} parcelas cadastradas!` : "Conta cadastrada!");
      if (isShared && selectedGroup) fetchBills(selectedGroup);
      else if (!isShared) fetchIndividualBills();
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

    const isShared = selectedBill.scope === 'SHARED';
    const ids = editSelectedMembers.length === 0 ? members.map((m) => m.id) : editSelectedMembers;

    if (isShared) {
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
    }

    try {
      const res = await fetch(`/api/controle-contas/contas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedBill.id,
          title: editName,
          amount: parseLocaleNumber(editValue),
          dueDate: new Date(editDueDate).toISOString(),
          recurrence: editRecurrence,
          endDate: editRecurrence === 'RECURRING' && editEndDate ? new Date(editEndDate).toISOString() : null,
          paid: editPaid,
          shares: isShared ? ids.map(id => ({
            memberId: id,
            type: editShareType,
            amount: parseLocaleNumber(editShares.find(s => s.memberId === id)?.amount ?? "0")
          })) : undefined,
        }),
      });
      if (!res.ok) throw new Error("Erro ao editar conta");
      setEditModalOpen(false);
      setToastMsg("Conta editada!");
      if (isShared && selectedGroup) fetchBills(selectedGroup);
      else if (!isShared) fetchIndividualBills();
    } catch {
      setError("Erro ao editar conta");
    } finally {
      setLoading(false);
    }
  }

  async function handleTogglePaid(bill: Bill) {
    setLoading(true);
    setError("");
    try {
      const body: any = { id: bill.id };
      if (bill.recurrence === 'RECURRING' && bill.currentCycle) {
        body.paidMonth = { monthKey: bill.currentCycle.monthKey, paid: !bill.currentCycle.paid };
      } else {
        body.paid = !bill.paid;
      }
      const res = await fetch(`/api/controle-contas/contas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Erro ao atualizar status");
      if (bill.scope === 'SHARED' && selectedGroup) fetchBills(selectedGroup);
      else if (bill.scope === 'INDIVIDUAL') fetchIndividualBills();
    } catch {
      setError("Erro ao atualizar status de pagamento");
    } finally {
      setLoading(false);
    }
  }

  async function deleteBill(mode: 'single' | 'future' | 'all', successMsg: string) {
    if (!selectedBill) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/controle-contas/contas?id=${selectedBill.id}&mode=${mode}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir conta");
      const isShared = selectedBill.scope === 'SHARED';
      setConfirmDeleteBill(false);
      setInstallmentDeleteOpen(false);
      setEditModalOpen(false);
      setSelectedBill(null);
      setToastMsg(successMsg);
      if (isShared && selectedGroup) await fetchBills(selectedGroup);
      else if (!isShared) await fetchIndividualBills();
    } catch {
      setError("Erro ao excluir conta");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    await deleteBill('single', 'Conta excluída!');
  }

  async function handleDeleteInstallment(mode: 'single' | 'future' | 'all') {
    const msg =
      mode === 'single' ? 'Parcela excluída!'
      : mode === 'future' ? 'Parcelas excluídas!'
      : 'Série de parcelas excluída!';
    await deleteBill(mode, msg);
  }

  // Effects
  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const groupIdParam = params.get("groupId");
      const viewParam = params.get("view");
      if (groupIdParam) {
        setSelectedGroup(Number(groupIdParam));
        setViewMode('shared');
      } else if (viewParam === 'individual') {
        setViewMode('individual');
      }
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'shared') {
      if (selectedGroup) {
        fetchBills(selectedGroup);
        fetchMembers(selectedGroup);
      } else {
        setBills([]);
        setMembers([]);
      }
    } else {
      setBills([]);
      fetchIndividualBills();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, selectedGroup]);

  useEffect(() => {
    const ids = selectedMembers.length === 0 ? members.map((m) => m.id) : selectedMembers;
    setShares(getEqualShares(shareType, value, ids));
  }, [selectedMembers, value, shareType, members, getEqualShares]);

  useEffect(() => {
    const ids = editSelectedMembers.length === 0 ? members.map((m) => m.id) : editSelectedMembers;
    setEditShares(getEqualShares(editShareType, editValue, ids));
  }, [editValue, editSelectedMembers, editShareType, members, getEqualShares]);

  return {
    // View mode
    viewMode,
    setViewMode,

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
    dueDate,
    setDueDate,
    recurrence,
    setRecurrence,
    endDate,
    setEndDate,
    installmentCount,
    setInstallmentCount,
    paid,
    setPaid,
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
    editDueDate,
    setEditDueDate,
    editRecurrence,
    setEditRecurrence,
    editEndDate,
    setEditEndDate,
    editPaid,
    setEditPaid,
    editShareType,
    setEditShareType,
    editSelectedMembers,
    setEditSelectedMembers,
    editShares,
    setEditShares,
    handleEdit,

    // Paid toggle (quick action on card)
    handleTogglePaid,

    // Delete
    confirmDeleteBill,
    setConfirmDeleteBill,
    handleDelete,
    installmentDeleteOpen,
    setInstallmentDeleteOpen,
    openDeleteConfirm,
    handleDeleteInstallment,

    // Helpers
    getEqualShares,
    parseLocaleNumber,
  };
}
