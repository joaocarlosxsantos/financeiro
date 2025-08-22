import { useState } from 'react';
import { Modal } from './modal';
import { Input } from './input';
import { Label } from './label';
import { Button } from './button';

export function TagCreateModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
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
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
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
    <Modal open={open} onClose={onClose} title="Nova Tag">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <Label htmlFor="tag-name">Nome</Label>
          <Input id="tag-name" value={name} onChange={e => setName(e.target.value)} />
          {error && <span className="text-red-600 text-xs">{error}</span>}
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        </div>
      </form>
    </Modal>
  );
}
