"use client";
import React from 'react';
import type { Member, GroupSummary } from '@/types/controle-contas';
import { Modal } from '@/components/controle-contas/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function MemberForm({ open, onClose, initial, groups, onSuccess }: { open: boolean; onClose: () => void; initial?: Member; groups?: GroupSummary[]; onSuccess?: () => void }) {
  const [name, setName] = React.useState(initial?.name ?? '');
  // email field removed per UX request
  const [phone, setPhone] = React.useState(initial?.phone ?? '');
  const [groupId, setGroupId] = React.useState<number | string>(initial?.groupId ?? (groups?.[0]?.id ?? ''));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (initial) {
      setName(initial.name ?? '');
      setPhone(initial.phone ?? '');
      setGroupId(initial.groupId ?? (groups?.[0]?.id ?? ''));
    }
    // when groups change and there's no initial, keep default
    if (!initial && groups && groups.length > 0 && (groupId === '' || groupId === undefined)) {
      setGroupId(groups[0].id);
    }
  }, [initial, groups, groupId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
  const payload = { id: initial?.id, name, phone, groupId };
      const method = initial?.id ? 'PUT' : 'POST';
      const res = await fetch('/api/controle-contas/membros', { method, body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) {
        const text = await res.text().catch(() => null);
        setError(text || 'Erro ao salvar membro');
        return;
      }
      // sucesso: notificar pai para revalidar lista e fechar modal
      onSuccess?.();
      onClose();
    } catch (err) {
      setError('Erro ao salvar membro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-4">
        <h3 className="text-lg font-semibold">{initial?.id ? 'Editar Membro' : 'Novo Membro'}</h3>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" />
  {/* email removed */}
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone" />
        <select className="w-full rounded-md bg-input p-2" value={String(groupId)} onChange={(e) => setGroupId(Number(e.target.value))}>
          {groups?.map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}
        </select>
  {error && <div className="text-sm text-red-600">{error}</div>}
  <div className="flex justify-end"><Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button></div>
      </form>
    </Modal>
  );
}
