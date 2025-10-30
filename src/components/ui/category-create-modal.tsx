// import { useState } from 'react';
import { Modal } from './modal';
import { Input } from './input';
import { Label } from './label';
import { Button } from './button';

import React, { useState } from 'react';

interface CategoryCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
  initial?: { id?: string; name?: string; color?: string; type?: 'EXPENSE' | 'INCOME' | 'BOTH'; icon?: string } | null;
}

export function CategoryCreateModal({ open, onClose, onCreated, initial }: CategoryCreateModalProps) {
  const [name, setName] = useState(initial?.name || '');
  const [type, setType] = useState<'INCOME' | 'EXPENSE' | 'BOTH'>(initial?.type || 'INCOME');
  const [color, setColor] = useState(initial?.color || '#3B82F6');
  const [icon, setIcon] = useState(initial?.icon || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    setName(initial?.name || '');
    setType(initial?.type || 'INCOME');
    setColor(initial?.color || '#3B82F6');
    setIcon(initial?.icon || '');
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
      // Editar categoria existente
      res = await fetch(`/api/categories/${initial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color, type, icon: icon || undefined }),
      });
    } else {
      // Criar nova categoria
      res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color, type, icon: icon || undefined }),
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
    <Modal open={open} onClose={onClose} title={initial?.id ? 'Editar Categoria' : 'Nova Categoria'}>
      <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
        <div>
          <Label htmlFor="category-name">Nome</Label>
          <Input id="category-name" value={name} onChange={(e) => setName(e.target.value)} />
          {error && <span className="text-red-600 text-xs">{error}</span>}
        </div>
        <div>
          <Label htmlFor="category-color">Cor</Label>
          <Input id="category-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="category-type">Tipo</Label>
          <select
            id="category-type"
            value={type}
            onChange={(e) => setType(e.target.value as 'INCOME' | 'EXPENSE' | 'BOTH')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="INCOME">Ganho</option>
            <option value="EXPENSE">Gasto</option>
            <option value="BOTH">Ambos</option>
          </select>
        </div>
        <div>
          <Label htmlFor="category-icon">Ícone (Opcional)</Label>
          <Input id="category-icon" placeholder="Ex: 🍕" value={icon} onChange={(e) => setIcon(e.target.value)} />
        </div>
        <div className="flex gap-2 md:col-span-2">
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
