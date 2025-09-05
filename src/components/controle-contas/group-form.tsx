"use client";
import React from 'react';
import type { GroupSummary } from '@/types/controle-contas';
import { Modal } from '@/components/controle-contas/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function GroupForm({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: GroupSummary }) {
  const [name, setName] = React.useState(initial?.name ?? '');
  const [description, setDescription] = React.useState(initial?.description ?? '');

  React.useEffect(() => { if (initial) { setName(initial.name ?? ''); setDescription(initial.description ?? ''); } }, [initial]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
  const payload = { id: initial?.id, name, description };
  const method = initial?.id ? 'PUT' : 'POST';
  await fetch('/api/controle-contas/grupos', { method, body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-4">
        <h3 className="text-lg font-semibold">{initial?.id ? 'Editar Grupo' : 'Novo Grupo'}</h3>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" />
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição" />
        <div className="flex justify-end"><Button type="submit">Salvar</Button></div>
      </form>
    </Modal>
  );
}
