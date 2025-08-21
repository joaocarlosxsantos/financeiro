import { useState } from 'react';
import { Modal } from './modal';
import { Input } from './input';
import { Label } from './label';
import { Button } from './button';

export function WalletCreateModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('Banco');
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
    await fetch('/api/wallets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type }),
    });
    setLoading(false);
    setName('');
    onCreated();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova Carteira">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <Label htmlFor="wallet-name">Nome</Label>
          <Input id="wallet-name" value={name} onChange={e => setName(e.target.value)} />
          {error && <span className="text-red-600 text-xs">{error}</span>}
        </div>
        <div>
          <Label htmlFor="wallet-type">Tipo</Label>
          <select id="wallet-type" value={type} onChange={e => setType(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="Banco">Banco</option>
            <option value="Dinheiro">Dinheiro</option>
            <option value="Cartão">Cartão</option>
            <option value="Outro">Outro</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        </div>
      </form>
    </Modal>
  );
}
