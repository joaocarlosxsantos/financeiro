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
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    date: '',
    categoryId: '',
    walletId: '',
    type: 'expense', // 'expense' ou 'income'
    recurring: false,
    recurringStart: today,
    recurringEnd: '',
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
        type: initialData.type || 'expense',
        recurring: initialData.isRecurring || initialData.recurring || false,
        recurringStart: initialData.recurringStart || today,
        recurringEnd: initialData.recurringEnd || '',
      });
    } else {
      setForm(f => ({ ...f, recurringStart: today }));
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
      <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
        <div>
          <Label htmlFor="type">Tipo</Label>
          <select
            id="type"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mb-2"
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
          >
            <option value="expense">Gasto</option>
            <option value="income">Ganho</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="recurring"
            type="checkbox"
            checked={form.recurring}
            onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))} 
          />
          <Label htmlFor="recurring">Recorrente</Label>
        </div>
        {form.recurring && (
          <>
            <div>
              <Label htmlFor="recurringStart">Início</Label>
              <Input
                id="recurringStart"
                type="date"
                value={form.recurringStart}
                onChange={e => setForm(f => ({ ...f, recurringStart: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="recurringEnd">Fim</Label>
              <Input
                id="recurringEnd"
                type="date"
                value={form.recurringEnd}
                onChange={e => setForm(f => ({ ...f, recurringEnd: e.target.value }))}
              />
            </div>
          </>
        )}
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
        <div className="flex justify-end gap-2 mt-4 md:col-span-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}
