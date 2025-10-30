import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export interface TransactionFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
  title?: string;
  categories?: Array<{ id: string; name: string }>;
  wallets?: Array<{ id: string; name: string }>;
}

export function TransactionFormModal({
  open,
  onClose,
  onSubmit,
  initialData,
  title = 'Editar Transação',
  categories = [],
  wallets = [],
}: TransactionFormModalProps) {
  const [form, setForm] = useState({
    description: '',
    amount: '',
    date: '',
    categoryId: '',
    walletId: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (initialData) {
      setForm({
        description: initialData.description || '',
        amount: initialData.amount || '',
        date: initialData.date ? initialData.date.slice(0, 10) : '',
        categoryId: initialData.categoryId || '',
        walletId: initialData.walletId || '',
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};
    if (!form.description) newErrors.description = 'Descrição obrigatória';
    if (!form.amount || isNaN(Number(form.amount))) newErrors.amount = 'Valor obrigatório';
    if (!form.date) newErrors.date = 'Data obrigatória';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    onSubmit(form);
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div>
          <Label htmlFor="description">Descrição</Label>
          <Input
            id="description"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
          {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
        </div>
        <div>
          <Label htmlFor="amount">Valor</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
          />
          {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
        </div>
        <div>
          <Label htmlFor="date">Data</Label>
          <Input
            id="date"
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          />
          {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
        </div>
        <div>
          <Label htmlFor="category">Categoria</Label>
          <select
            id="category"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.categoryId}
            onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
          >
            <option value="">Selecione</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="wallet">Carteira</Label>
          <select
            id="wallet"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.walletId}
            onChange={e => setForm(f => ({ ...f, walletId: e.target.value }))}
          >
            <option value="">Selecione</option>
            {wallets.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}
