"use client";
import React from 'react';
import type { BillWithGroup, GroupSummary } from '@/types/controle-contas';
import { Modal } from '@/components/controle-contas/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function BillForm({ open, onClose, initial, groups }: { open: boolean; onClose: () => void; initial?: Partial<BillWithGroup>; groups?: GroupSummary[] }) {
  const [title, setTitle] = React.useState(initial?.title ?? '');
  const [description, setDescription] = React.useState(initial?.description ?? '');
  const [amount, setAmount] = React.useState<string | number>(initial?.amount ?? '');
  const [dueDate, setDueDate] = React.useState(initial?.dueDate ? new Date(initial.dueDate).toISOString().slice(0,10) : '');
  const [groupId, setGroupId] = React.useState<number | string>(initial?.group?.id ?? (groups?.[0]?.id ?? ''));

  React.useEffect(() => { if (initial) { setTitle(initial.title ?? ''); setDescription(initial.description ?? ''); setAmount(initial.amount ?? ''); setDueDate(initial.dueDate ? new Date(initial.dueDate).toISOString().slice(0,10) : ''); setGroupId(initial.group?.id ?? (groups?.[0]?.id ?? '')); } }, [initial, groups]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // validação local
    const method = initial?.id ? 'PUT' : 'POST';
    setTitle(title ?? '');
    if (!title || !amount || !dueDate || !groupId) {
      // simples validação para evitar 400
      alert('Preencha todos os campos obrigatórios: título, valor, vencimento e grupo.');
      return;
    }
    // normalizar amount: aceitar formatos como "1.234,56" ou "1234.56"
    let normalizedAmount: number;
    if (typeof amount === 'number') normalizedAmount = amount;
    else {
      const s = String(amount).trim();
      // remove pontos de milhar, troca vírgula por ponto
      const cleaned = s.replace(/\./g, '').replace(',', '.').replace(/[^\\d.-]/g, '');
      normalizedAmount = Number(cleaned);
    }
    if (!isFinite(normalizedAmount) || normalizedAmount === 0) {
      alert('Valor inválido');
      return;
    }
    const payload = { id: initial?.id, title, description, amount: normalizedAmount, dueDate, groupId };
    try {
      const res = await fetch('/api/controle-contas/contas', { method, body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        throw new Error(txt || 'Erro ao salvar conta');
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert((err as Error).message || 'Erro ao salvar conta');
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-4">
        <h3 className="text-lg font-semibold">{initial?.id ? 'Editar Conta' : 'Nova Conta'}</h3>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" />
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição" />
        <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Valor" />
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} placeholder="Vencimento" />
        <select className="w-full rounded-md bg-input p-2" value={String(groupId)} onChange={(e) => setGroupId(Number(e.target.value))}>
          {groups?.map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}
        </select>
        <div className="flex justify-end"><Button type="submit">Salvar</Button></div>
      </form>
    </Modal>
  );
}
