"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Toast } from "@/components/ui/toast";
import { Modal } from "@/components/controle-contas/modal";
import { WhatsAppIcon } from '@/components/controle-contas/icons';
import { BillCard } from '@/components/controle-contas/cards';

type Member = { id: number; name: string; phone?: string };
type BillShare = { memberId: number; type: 'value' | 'percent'; amount: number };
type Bill = { id: number; name: string; value: number; shares?: BillShare[] };
type Group = { id: number; name: string };

export default function Page() {
  function parseLocaleNumber(v: string | number) {
    if (typeof v === 'number') return v;
    let s = String(v || '').trim();
    if (s === '') return 0;
    const hasDot = s.indexOf('.') !== -1;
    const hasComma = s.indexOf(',') !== -1;
    if (hasDot && hasComma) {
      // assume dot as thousands sep, comma as decimal
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (hasComma) {
      // only comma -> decimal
      s = s.replace(',', '.');
    } else if (hasDot) {
      // only dot -> could be decimal or thousands. If more than one dot, remove dots, else keep single dot as decimal
      const dotCount = (s.match(/\./g) || []).length;
      if (dotCount > 1) s = s.replace(/\./g, '');
      // else keep single dot as decimal separator
    }
    // remove any non numeric chars except minus and decimal point
    s = s.replace(/[^\d.-]/g, '');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

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

  function handleOpenAddModal() {
    setAddModalOpen(true);
    setSelectedMembers([]);
    setShares(getEqualShares(shareType, value, members.map((m) => m.id)));
  }

  // estados usados pelo componente
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);

  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [shares, setShares] = useState<Array<{ memberId: number; amount: string }>>([]);
  const [shareType, setShareType] = useState<'value' | 'percent'>('value');
  const [value, setValue] = useState<string>('');
  // controlled input for add modal value
  const [name, setName] = useState<string>('');

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editValue, setEditValue] = useState('');
  // controlled input for edit modal value
  const [editSelectedMembers, setEditSelectedMembers] = useState<number[]>([]);
  const [editShares, setEditShares] = useState<Array<{ memberId: number; amount: string }>>([]);
  const [editShareType, setEditShareType] = useState<'value' | 'percent'>('value');

  // when editValue/editSelectedMembers/editShareType or members change, recalc editShares
  useEffect(() => {
    const ids = editSelectedMembers.length === 0 ? members.map((m) => m.id) : editSelectedMembers;
    setEditShares(getEqualShares(editShareType, editValue, ids));
  }, [editValue, editSelectedMembers, editShareType, members, getEqualShares]);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [validationError, setValidationError] = useState('');

  const [confirmDeleteBill, setConfirmDeleteBill] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    const ids = selectedMembers.length === 0 ? members.map((m) => m.id) : selectedMembers;
    setShares(getEqualShares(shareType, value, ids));
  }, [selectedMembers, value, shareType, members.length, members, getEqualShares]);


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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    function normalizeValue(v: string | number) {
      return parseLocaleNumber(v);
    }
    const ids = selectedMembers.length === 0 ? members.map((m) => m.id) : selectedMembers;
    function parseInputToNumber(v: string | number) {
      return parseLocaleNumber(v);
    }
    if (shareType === "value") {
  const soma = ids.reduce((acc, id) => acc + parseInputToNumber(shares.find((s) => s.memberId === id)?.amount ?? "0"), 0);
  const total = normalizeValue(value) || 0;
      // comparar em centavos para evitar erros de ponto flutuante
      const somaCents = Math.round(soma * 100);
      const totalCents = Math.round(total * 100);
      if (somaCents !== totalCents) {
        const msg = `A soma dos valores dos participantes (${(somaCents/100).toFixed(2)}) difere do total (${(totalCents/100).toFixed(2)}). (somaCents=${somaCents}, totalCents=${totalCents})`;
        console.debug('validation failed (value)', { soma, total, somaCents, totalCents, shares });
        setValidationError(msg);
        setLoading(false);
        return;
      }
    } else {
      const soma = ids.reduce((acc, id) => acc + parseInputToNumber(shares.find((s) => s.memberId === id)?.amount ?? "0"), 0);
      // work in tenths of percent to avoid float issues (one decimal precision expected)
      const somaTenths = Math.round(soma * 10);
      if (somaTenths !== 1000) {
        const msg = `A soma das porcentagens dos participantes (${(somaTenths/10).toFixed(1)}%) deve ser 100.0%. (somaTenths=${somaTenths})`;
        console.debug('validation failed (percent)', { soma, somaTenths, shares });
        setValidationError(msg);
        setLoading(false);
        return;
      }
    }
    try {
      if (!selectedGroup) return;
      const allIds = selectedMembers.length === 0 ? members.map((m) => m.id) : selectedMembers;
  const sharesPayload = allIds.map((memberId) => ({ memberId, type: shareType, amount: parseInputToNumber(shares.find((s) => s.memberId === memberId)?.amount ?? "0") }));
      const res = await fetch("/api/controle-contas/contas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ groupId: selectedGroup, title: name, amount: normalizeValue(value), dueDate: new Date().toISOString(), description: '', shares: sharesPayload }),
      });
      if (!res.ok) throw new Error("Erro ao cadastrar conta");
      setName("");
      setValue("");
      setSelectedMembers([]);
      setShares([]);
      setAddModalOpen(false);
      fetchBills(selectedGroup);
    } catch {
      setError("Erro ao cadastrar conta");
    } finally {
      setLoading(false);
    }
  }

  const handleToastClose = useCallback(() => setToastMsg(null), []);
  const handleValidationClose = useCallback(() => setValidationError(''), []);
  const handleEditModalClose = useCallback(() => setEditModalOpen(false), []);
  const handleConfirmDeleteBillClose = useCallback(() => setConfirmDeleteBill(false), []);
  const handleAddModalClose = useCallback(() => setAddModalOpen(false), []);

  return (
    <div className="flex flex-col gap-12 w-full max-w-7xl mx-auto">
  {toastMsg && <Toast open={true} message={toastMsg} onClose={handleToastClose} inline={false} />}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 rounded-3xl border border-neutral-200/70 bg-white p-6 md:p-10 shadow-xl dark:border-neutral-800 dark:bg-neutral-900/80">
        <div className="flex-1 min-w-0 md:min-w-[260px]">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-emerald-900 dark:text-emerald-100 mb-2">Contas do grupo</h1>
          <p className="max-w-2xl text-base text-neutral-600 dark:text-neutral-400">Gerencie e visualize as contas do grupo selecionado. Edite ou exclua contas diretamente nos cards.</p>
        </div>
        <div className="flex flex-col gap-4 md:gap-6 md:w-auto md:items-center">
          <div className="flex flex-col items-stretch gap-3 md:items-center md:flex-row md:gap-6">
            <div className="flex-1 min-w-0">
              <div className="relative w-full">
                <select value={selectedGroup ?? ""} onChange={(e) => setSelectedGroup(Number(e.target.value) || null)} className="appearance-none w-full rounded-2xl border border-neutral-300 bg-white dark:bg-neutral-800 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 px-4 py-3 pr-10 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600 shadow-sm">
                  <option value="" disabled hidden>-- Escolha o grupo --</option>
                  {groups.map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <svg className="h-5 w-5 text-neutral-400 dark:text-neutral-300" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </div>
            </div>
            <div className="md:ml-2">
              <a href="/controle-contas/grupos" className="inline-flex items-center rounded-2xl border border-blue-200/60 bg-blue-50 px-5 py-2 text-base font-semibold text-blue-700 shadow-md transition hover:bg-blue-100 hover:shadow-lg dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/40">Gerenciar Grupos</a>
            </div>
          </div>
        </div>
      </header>
      <div style={{ zIndex: 9999, position: 'relative' }}>
  <Modal open={!!validationError} onClose={handleValidationClose} title="Erro de validação">
          <div className="mb-4 text-red-700 dark:text-red-300 font-semibold">{validationError}</div>
          <div className="flex justify-end"><button onClick={() => setValidationError("")} className="rounded px-4 py-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">Fechar</button></div>
        </Modal>
      </div>
  {loading && <div className="p-4 text-center">Carregando...</div>}
      {error && <p className="text-lg text-red-600 dark:text-red-400">{error}</p>}
      {selectedGroup && (
        <>
          <div className="flex flex-col sm:flex-row">
            <button className="rounded-2xl bg-emerald-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:focus:ring-emerald-300" onClick={handleOpenAddModal}>Adicionar conta</button>
          </div>
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-8">
            <ul className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
              {bills.map((bill) => (
                <li key={bill.id} className="">
                  <BillCard name={bill.name} value={bill.value} onClick={() => handleOpenEditModal(bill)} shares={bill.shares} members={members} />
                </li>
              ))}

              <Modal open={editModalOpen} onClose={handleEditModalClose} title="Editar Conta">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!selectedBill) return;
                    setLoading(true);
                    setError("");
                    function normalizeValue(v: string | number) { return parseLocaleNumber(v); }
                    function parseInputToNumber(v: string | number) { return parseLocaleNumber(v); }
                    const ids = editSelectedMembers.length === 0 ? members.map((m) => m.id) : editSelectedMembers;
                    if (editShareType === "value") {
                      const soma = ids.reduce((acc, id) => acc + parseInputToNumber(editShares.find((s) => s.memberId === id)?.amount ?? "0"), 0);
                      const total = normalizeValue(editValue) || 0;
                      const somaCents = Math.round(soma * 100);
                      const totalCents = Math.round(total * 100);
                      if (somaCents !== totalCents) {
                        const msg = `A soma dos valores dos participantes (${(somaCents/100).toFixed(2)}) difere do total (${(totalCents/100).toFixed(2)}). (somaCents=${somaCents}, totalCents=${totalCents})`;
                        console.debug('validation failed (edit value)', { soma, total, somaCents, totalCents, editShares });
                        setValidationError(msg);
                        setLoading(false);
                        return;
                      }
                    } else {
                      const soma = ids.reduce((acc, id) => acc + parseInputToNumber(editShares.find((s) => s.memberId === id)?.amount ?? "0"), 0);
                      const somaTenths = Math.round(soma * 10);
                      if (somaTenths !== 1000) {
                        const msg = `A soma das porcentagens dos participantes (${(somaTenths/10).toFixed(1)}%) deve ser 100.0%. (somaTenths=${somaTenths})`;
                        console.debug('validation failed (edit percent)', { soma, somaTenths, editShares });
                        setValidationError(msg);
                        setLoading(false);
                        return;
                      }
                    }
                    try {
                      const allIds = editSelectedMembers.length === 0 ? members.map((m) => m.id) : editSelectedMembers;
                      const sharesPayload = allIds.map((memberId) => ({ memberId, type: editShareType, amount: parseLocaleNumber(editShares.find((s) => s.memberId === memberId)?.amount ?? "0") }));
                      const res = await fetch(`/api/controle-contas/contas`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: selectedBill.id, title: editName, amount: normalizeValue(editValue), dueDate: null, description: '', shares: sharesPayload }),
                      });
                      if (!res.ok) throw new Error("Erro ao editar conta");
                      setEditModalOpen(false);
                      fetchBills(selectedGroup!);
                    } catch {
                      setError("Erro ao editar conta");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="flex flex-col gap-3"
                >
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required className="rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-neutral-900 dark:text-neutral-100" placeholder="Nome da conta" />
                  <input type="text" inputMode="decimal" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => { const v = editValue; const ids = editSelectedMembers.length === 0 ? members.map((m) => m.id) : editSelectedMembers; setEditShares(getEqualShares(editShareType, v, ids)); }} required step="0.01" className="rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-neutral-900 dark:text-neutral-100" placeholder="Valor" />
                  <div>
                    <label className="block font-semibold mb-1">Participantes:</label>
                    <div className="flex flex-wrap gap-2">
                      <label className="flex items-center gap-1 font-semibold">
                        <input type="checkbox" checked={editSelectedMembers.length === 0} onChange={() => { if (editSelectedMembers.length === 0) { setEditSelectedMembers(members.map((m) => m.id)); } else { setEditSelectedMembers([]); } }} />
                        Todos
                      </label>
                      {members.map((m) => (
                        <label key={m.id} className="flex items-center gap-1">
                          <input type="checkbox" checked={editSelectedMembers.length === 0 || editSelectedMembers.includes(m.id)} onChange={(e) => { let newSelected; if (editSelectedMembers.length === 0) { newSelected = members.filter((mem) => mem.id !== m.id).map((mem) => mem.id); } else if (e.target.checked) { newSelected = [...editSelectedMembers, m.id]; } else { newSelected = editSelectedMembers.filter((id) => id !== m.id); } if (newSelected.length === members.length) { setEditSelectedMembers([]); } else { setEditSelectedMembers(newSelected); } }} />
                          <span>{m.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {(editSelectedMembers.length === 0 ? members.length > 0 : editSelectedMembers.length > 0) && (
                    <>
                      <div className="flex gap-4 items-center mt-2">
                        <label className="font-semibold">Divisão:</label>
                        <label className="flex items-center gap-1"><input type="radio" checked={editShareType === "value"} onChange={() => setEditShareType("value")} /> Valor</label>
                        <label className="flex items-center gap-1"><input type="radio" checked={editShareType === "percent"} onChange={() => setEditShareType("percent")} /> Porcentagem</label>
                      </div>
                      <div className="flex flex-col gap-2 mt-2">
                        {(editSelectedMembers.length === 0 ? members.map((m) => m.id) : editSelectedMembers).map((memberId) => {
                          const member = members.find((m) => m.id === memberId);
                          const share = editShares.find((s) => s.memberId === memberId);
                          return (
                            <div key={memberId} className="flex items-center gap-2">
                              <span className="min-w-0 w-28 md:w-32 truncate">{member?.name}</span>
                              <input type="number" min={editShareType === "percent" ? "0" : undefined} step="0.01" value={share?.amount ?? ""} onChange={(e) => { const val = e.target.value; setEditShares((prev) => prev.map((s) => s.memberId === memberId ? { ...s, amount: val } : s)); }} className="w-20 md:w-28 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-neutral-900 dark:text-neutral-100" placeholder={editShareType === "value" ? "Valor" : "%"} />
                              {editShareType === "value" && editValue && (<span className="text-sm text-neutral-500">({(((parseLocaleNumber(share?.amount ?? "0") || 0) / parseLocaleNumber(editValue)) * 100).toFixed(1)}%)</span>)}
                              {editShareType === "percent" && editValue && (<span className="text-sm text-neutral-500">(R$ {(((parseLocaleNumber(share?.amount ?? "0") || 0) * parseLocaleNumber(editValue)) / 100).toFixed(2)})</span>)}
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-sm mt-2">Soma total: {editShareType === "value" ? `R$ ${editShares.reduce((acc, s) => acc + ((editSelectedMembers.length === 0 ? members.map((m) => m.id) : editSelectedMembers).includes(s.memberId) ? (parseLocaleNumber(s.amount || "0") || 0) : 0), 0).toFixed(2)}` : `${editShares.reduce((acc, s) => acc + ((editSelectedMembers.length === 0 ? members.map((m) => m.id) : editSelectedMembers).includes(s.memberId) ? (parseLocaleNumber(s.amount || "0") || 0) : 0), 0).toFixed(2)}%`}</div>
                    </>
                  )}
                  <div className="flex justify-end gap-2 mt-2">
                    {selectedBill && (
                      <button onClick={() => setConfirmDeleteBill(true)} className="rounded px-4 py-2 bg-red-200 dark:bg-red-800 text-neutral-800 dark:text-neutral-200">Excluir conta</button>
                    )}
                    <button type="button" onClick={() => setEditModalOpen(false)} className="rounded px-4 py-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">Cancelar</button>
                    <button type="submit" className="rounded px-4 py-2 bg-blue-600 text-white font-semibold hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400">Salvar</button>
                  </div>
                </form>

                <Modal open={confirmDeleteBill} onClose={handleConfirmDeleteBillClose} title="Confirmar exclusão">
                  <div className="mb-4">Tem certeza que deseja excluir a conta <b>{selectedBill?.name}</b>?</div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setConfirmDeleteBill(false)} className="rounded px-4 py-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">Cancelar</button>
                    <button onClick={async () => {
                      if (!selectedBill) return;
                      setLoading(true);
                      setError("");
                      try {
                        const res = await fetch(`/api/controle-contas/contas?billId=${selectedBill.id}`, { method: "DELETE" });
                        if (!res.ok) throw new Error("Erro ao excluir conta");
                        setConfirmDeleteBill(false);
                        setEditModalOpen(false);
                        setSelectedBill(null);
                        await fetchBills(selectedGroup!);
                      } catch {
                        setError("Erro ao excluir conta");
                      } finally {
                        setLoading(false);
                      }
                    }} className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700">Excluir</button>
                  </div>
                </Modal>
              </Modal>
            </ul>
            <div className="mb-6 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 p-8 flex flex-col gap-4 border border-emerald-200 dark:border-emerald-800 shadow-md">
              <div className="text-emerald-900 dark:text-emerald-200 text-xl font-bold">Subtotal: <span className="font-extrabold">R$ {bills.reduce((acc, b) => acc + b.value, 0).toFixed(2)}</span></div>
              <div className="text-emerald-900 dark:text-emerald-200 text-xl font-bold">Pessoas no grupo: <span className="font-extrabold">{members.length}</span></div>
              {members.length > 0 && (
                <div className="mt-4">
                  <div className="text-emerald-900 dark:text-emerald-200 text-lg font-bold mb-2">Total individual por membro:</div>
                  <div className="flex flex-col gap-1">
                                {members.map((member) => {
                                  let total = 0;
                                  const lines: string[] = [];
                                  bills.forEach((bill) => {
                                    let amountForMember = 0;
                                    if (bill.shares && bill.shares.length > 0) {
                                      const share = bill.shares.find((s) => s.memberId === member.id);
                                      if (share) {
                                        if (share.type === "value") amountForMember = share.amount;
                                        if (share.type === "percent") amountForMember = (share.amount * bill.value) / 100;
                                        lines.push(`${bill.name}: R$ ${amountForMember.toFixed(2)}`);
                                        total += amountForMember;
                                      }
                                    } else {
                                      amountForMember = bill.value / members.length;
                                      lines.push(`${bill.name}: R$ ${amountForMember.toFixed(2)}`);
                                      total += amountForMember;
                                    }
                                  });

                                  const message = () => {
                                    const header = `Olá ${member.name}, segue sua parte nas contas do grupo:`;
                                    const body = lines.join('\n');
                                    const footer = `Total: R$ ${total.toFixed(2)}`;
                                    return `${header}\n${body}\n${footer}`;
                                  };

                                  const handleCopy = async () => {
                                    try {
                                      await navigator.clipboard.writeText(message());
                                      setToastMsg('Mensagem copiada');
                                    } catch (err) {
                                      setToastMsg('Não foi possível copiar');
                                    }
                                  };

                                  const handleWhatsapp = (phone?: string) => {
                                    if (!phone) return;
                                    const cleaned = phone.replace(/\D/g, '');
                                    const phoneForWa = (cleaned.length === 10 || cleaned.length === 11) ? `55${cleaned}` : cleaned;
                                    const url = `https://wa.me/${phoneForWa}?text=${encodeURIComponent(message())}`;
                                    window.open(url, '_blank');
                                  };

                                  return (
                                    <div key={member.id} className="flex gap-2 items-center text-base">
                                      <span className="font-semibold">{member.name}:</span>
                                      <span>R$ {total.toFixed(2)}</span>
                                      <div className="ml-auto flex gap-2">
                                        <button onClick={() => handleCopy()} className="inline-flex items-center rounded px-2 py-1 bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-sm" aria-label={`Copiar mensagem para ${member.name}`}>Copiar</button>
                                        {member.phone && (
                                          <button onClick={() => handleWhatsapp(member.phone)} className="inline-flex items-center rounded px-2 py-1 bg-green-600 text-white text-sm" aria-label={`Enviar WhatsApp para ${member.name}`}>
                                            <WhatsAppIcon className="h-4 w-4" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                  </div>
                </div>
              )}
              <hr className="my-6 border-neutral-200 dark:border-neutral-700" />
              <button className="rounded-2xl bg-blue-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus:ring-blue-300" onClick={async () => {
                if (!selectedGroup) return;
                try {
                  const res = await fetch(`/api/controle-contas/export-csv?groupId=${selectedGroup}`);
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({ error: 'Erro ao gerar CSV' }));
                    setToastMsg(err.error || 'Erro ao gerar CSV');
                    return;
                  }
                  const blob = await res.blob();
                  const disposition = res.headers.get('Content-Disposition') || '';
                  let filename = `divisao-contas-grupo-${selectedGroup}.csv`;
                  const match = /filename=(?:(?:"?)([^";]+))/.exec(disposition);
                  if (match && match[1]) filename = match[1];
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = filename;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                  setToastMsg('Download iniciado');
                } catch {
                  setToastMsg('Erro ao baixar CSV');
                }
              }}>Exportar CSV</button>
            </div>
          </div>

          <Modal open={addModalOpen} onClose={handleAddModalClose} title="Adicionar nova conta">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input type="text" placeholder="Nome da conta" value={name} onChange={(e) => setName(e.target.value)} required className="rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600" />
              <input type="text" inputMode="decimal" placeholder="Valor" value={value} onChange={(e) => setValue(e.target.value)} onBlur={() => { const v = value; const ids = selectedMembers.length === 0 ? members.map((m) => m.id) : selectedMembers; setShares(getEqualShares(shareType, v, ids)); }} required step="0.01" className="rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600" />
              <div>
                <label className="block font-semibold mb-1">Participantes:</label>
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center gap-1 font-semibold">
                    <input type="checkbox" checked={selectedMembers.length === 0} onChange={() => { if (selectedMembers.length === 0) { setSelectedMembers(members.map((m) => m.id)); } else { setSelectedMembers([]); } }} /> Todos
                  </label>
                  {members.map((m) => (
                    <label key={m.id} className="flex items-center gap-1">
                      <input type="checkbox" checked={selectedMembers.length === 0 || selectedMembers.includes(m.id)} onChange={(e) => { let newSelected; if (selectedMembers.length === 0) { newSelected = members.filter((mem) => mem.id !== m.id).map((mem) => mem.id); } else if (e.target.checked) { newSelected = [...selectedMembers, m.id]; } else { newSelected = selectedMembers.filter((id) => id !== m.id); } if (newSelected.length === members.length) { setSelectedMembers([]); } else { setSelectedMembers(newSelected); } }} />
                      <span>{m.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              {(selectedMembers.length === 0 ? members.length > 0 : selectedMembers.length > 0) && (
                <>
                  <div className="flex gap-4 items-center mt-2">
                    <label className="font-semibold">Divisão:</label>
                    <label className="flex items-center gap-1"><input type="radio" checked={shareType === "value"} onChange={() => setShareType("value")} /> Valor</label>
                    <label className="flex items-center gap-1"><input type="radio" checked={shareType === "percent"} onChange={() => setShareType("percent")} /> Porcentagem</label>
                  </div>
                  <div className="flex flex-col gap-2 mt-2">
                    {(selectedMembers.length === 0 ? members.map((m) => m.id) : selectedMembers).map((memberId) => {
                      const member = members.find((m) => m.id === memberId);
                      const share = shares.find((s) => s.memberId === memberId);
                      return (
                        <div key={memberId} className="flex items-center gap-2">
                          <span className="min-w-0 w-28 md:w-32 truncate">{member?.name}</span>
                          <input type="number" min={shareType === "percent" ? "0" : undefined} step="0.01" value={share?.amount ?? ""} onChange={(e) => { const val = e.target.value; setShares((prev) => prev.map((s) => s.memberId === memberId ? { ...s, amount: val } : s)); }} className="w-20 md:w-28 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-neutral-900 dark:text-neutral-100" placeholder={shareType === "value" ? "Valor" : "%"} />
                          {shareType === "value" && value && (<span className="text-sm text-neutral-500">({(((parseLocaleNumber(share?.amount ?? "0") || 0) / parseLocaleNumber(value)) * 100).toFixed(1)}%)</span>)}
                          {shareType === "percent" && value && (<span className="text-sm text-neutral-500">(R$ {(((parseLocaleNumber(share?.amount ?? "0") || 0) * parseLocaleNumber(value)) / 100).toFixed(2)})</span>)}
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-sm mt-2">Soma total: {shareType === "value" ? `R$ ${shares.reduce((acc, s) => acc + ((selectedMembers.length === 0 ? members.map((m) => m.id) : selectedMembers).includes(s.memberId) ? (parseLocaleNumber(s.amount || "0") || 0) : 0), 0).toFixed(2)}` : `${shares.reduce((acc, s) => acc + ((selectedMembers.length === 0 ? members.map((m) => m.id) : selectedMembers).includes(s.memberId) ? (parseLocaleNumber(s.amount || "0") || 0) : 0), 0).toFixed(2)}%`}</div>
                </>
              )}
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setAddModalOpen(false)} className="rounded px-4 py-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">Cancelar</button>
                <button type="submit" disabled={loading} className="rounded bg-blue-600 px-4 py-2 font-semibold text-white shadow transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus:ring-blue-300 disabled:opacity-60">Adicionar</button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </div>
  );
}
