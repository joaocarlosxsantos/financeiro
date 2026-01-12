import React, { useState, useEffect, useRef } from 'react';
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
  tags?: Array<{ id: string; name: string }>;
}

export function TransactionFormModal({
  open,
  onClose,
  onSubmit,
  initialData,
  title = 'Editar Transação',
  categories = [],
  wallets = [],
  tags = [],
}: TransactionFormModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    date: today,
    categoryId: '',
    walletId: '',
    tagIds: [] as string[],
    type: 'expense', // 'expense' ou 'income'
    recurring: false,
    recurringStart: today,
    recurringEnd: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isTagsDropdownOpen, setIsTagsDropdownOpen] = useState(false);
  const tagsDropdownRef = useRef<HTMLDivElement>(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tagsDropdownRef.current && !tagsDropdownRef.current.contains(event.target as Node)) {
        setIsTagsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm({
          description: initialData.description || '',
          amount: initialData.amount || '',
          date: initialData.date ? initialData.date.slice(0, 10) : '',
          categoryId: initialData.categoryId || '',
          walletId: initialData.walletId || '',
          tagIds: Array.isArray(initialData.tagIds) ? initialData.tagIds : [],
          type: initialData.transactionType || initialData.type || 'expense',
          recurring: initialData.isRecurring || initialData.recurring || false,
          recurringStart: initialData.recurringStart || today,
          recurringEnd: initialData.recurringEnd || '',
        });
      } else {
        // Reset completo quando não há dados iniciais
        setForm({
          description: '',
          amount: '',
          date: today,
          categoryId: '',
          walletId: '',
          tagIds: [],
          type: 'expense',
          recurring: false,
          recurringStart: today,
          recurringEnd: '',
        });
      }
    }
  }, [open, initialData]);

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
        <div>
          <Label htmlFor="tags">Tags</Label>
          <div className="relative" ref={tagsDropdownRef}>
            <button
              type="button"
              id="tags"
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent/50 transition-colors"
              onClick={() => setIsTagsDropdownOpen(!isTagsDropdownOpen)}
            >
              <span className={form.tagIds.length === 0 ? "text-muted-foreground" : ""}>
                {form.tagIds.length === 0 
                  ? "Selecione tags..." 
                  : `${form.tagIds.length} tag(s) selecionada(s)`
                }
              </span>
              <svg
                className={`h-4 w-4 transition-transform ${isTagsDropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isTagsDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-md border border-input bg-background shadow-lg max-h-60 overflow-y-auto">
                {tags.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Nenhuma tag disponível
                  </div>
                ) : (
                  <div className="py-1">
                    {tags.map(t => (
                      <label
                        key={t.id}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={form.tagIds.includes(t.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setForm(f => ({ ...f, tagIds: [...f.tagIds, t.id] }));
                            } else {
                              setForm(f => ({ ...f, tagIds: f.tagIds.filter(id => id !== t.id) }));
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm flex-1">{t.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 md:col-span-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}
