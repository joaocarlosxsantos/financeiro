import React, { useState } from 'react';
import { Modal } from './modal';
import { Input } from './input';
import { Label } from './label';
import { Button } from './button';

interface WalletCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
  initial?: { id?: string; name?: string; type?: string } | null;
}

export function WalletCreateModal({ open, onClose, onCreated, initial }: WalletCreateModalProps) {
  const [name, setName] = useState(initial?.name || '');
  const [type, setType] = useState(initial?.type || 'BANK');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Atualiza os campos se o modal for reaberto para editar outra carteira
  React.useEffect(() => {
    setName(initial?.name || '');
    setType(initial?.type || 'BANK');
  }, [initial, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nome é obrigatório.');
      return;
    }
    setLoading(true);
    setError('');
    let res;
    if (initial?.id) {
      // Editar carteira existente
      res = await fetch(`/api/wallets/${initial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type }),
      });
    } else {
      // Criar nova carteira
      res = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type }),
      });
    }
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      onCreated(data.id);
    } else {
      onCreated('');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? 'Editar Carteira' : 'Nova Carteira'}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <Label htmlFor="wallet-name">Nome</Label>
          <Input id="wallet-name" value={name} onChange={(e) => setName(e.target.value)} />
          {error && <span className="text-red-600 text-xs">{error}</span>}
        </div>
        <div>
          <Label htmlFor="wallet-type">Tipo</Label>
          <select
            id="wallet-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="BANK">Banco</option>
            <option value="CASH">Dinheiro</option>
            <option value="OTHER">Cartão / Outro</option>
            <option value="VALE_BENEFICIOS">Vale Benefícios</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? (initial?.id ? 'Atualizando...' : 'Salvando...') : (initial?.id ? 'Atualizar' : 'Salvar')}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
