import { useState } from 'react';
import { Modal } from './modal';
import { Input } from './input';
import { Label } from './label';
import { Button } from './button';

export function CategoryCreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'INCOME' | 'EXPENSE' | 'BOTH'>('INCOME');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nome é obrigatório.');
      return;
    }
    setLoading(true);
    setError('');
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      onCreated(data.id);
    } else {
      onCreated('');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova Categoria">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <Label htmlFor="category-name">Nome</Label>
          <Input id="category-name" value={name} onChange={(e) => setName(e.target.value)} />
          {error && <span className="text-red-600 text-xs">{error}</span>}
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
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
