// import { useState } from 'react';
import { Modal } from './modal';
import { Input } from './input';
import { Label } from './label';
import { Button } from './button';

import React, { useState } from 'react';

interface TagCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
  initial?: { id?: string; name?: string } | null;
}

export function TagCreateModal({ open, onClose, onCreated, initial }: TagCreateModalProps) {
  const [name, setName] = useState(initial?.name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    setName(initial?.name || '');
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
      // Editar tag existente
      res = await fetch(`/api/tags/${initial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
    } else {
      // Criar nova tag
      res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
    }
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('tags:changed'));
        }
      } catch (e) {}
      onCreated(data.id);
    } else {
      onCreated('');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? 'Editar Tag' : 'Nova Tag'}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <Label htmlFor="tag-name">Nome</Label>
          <Input id="tag-name" value={name} onChange={(e) => setName(e.target.value)} />
          {error && <span className="text-red-600 text-xs">{error}</span>}
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
