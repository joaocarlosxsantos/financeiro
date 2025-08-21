import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { TagSelector } from '@/components/ui/tag-selector';

export function QuickDespesaVariavelForm({ onSuccess }: { onSuccess?: () => void }) {
  const [form, setForm] = useState({ description: '', amount: '', date: '', categoryId: '', walletId: '', tags: [] as string[] });
  const [errors, setErrors] = useState<{ description?: string; amount?: string; date?: string }>({});
  const [categories, setCategories] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const [catsRes, walletsRes, tagsRes] = await Promise.all([
        fetch('/api/categories', { cache: 'no-store' }),
        fetch('/api/wallets', { cache: 'no-store' }),
        fetch('/api/tags', { cache: 'no-store' }),
      ]);
      if (catsRes.ok) setCategories(await catsRes.json());
      if (walletsRes.ok) setWallets(await walletsRes.json());
      if (tagsRes.ok) setTags(await tagsRes.json());
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: { description?: string; amount?: string; date?: string } = {};
    if (!form.description.trim()) newErrors.description = 'Descrição é obrigatória.';
    if (!form.amount || isNaN(Number(form.amount))) newErrors.amount = 'Valor é obrigatório.';
    if (!form.date) newErrors.date = 'Data é obrigatória.';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    setLoading(true);
    const payload: any = { ...form, amount: Number(form.amount), type: 'VARIABLE', isFixed: false };
    if (!payload.categoryId) delete payload.categoryId;
    if (!payload.walletId) delete payload.walletId;
    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    setForm({ description: '', amount: '', date: '', categoryId: '', walletId: '', tags: [] });
    setErrors({});
    if (onSuccess) onSuccess();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="description">Descrição</Label>
          <Input id="description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          {errors.description && <span className="text-red-600 text-xs">{errors.description}</span>}
        </div>
        <div>
          <Label htmlFor="amount">Valor</Label>
          <Input id="amount" type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          {errors.amount && <span className="text-red-600 text-xs">{errors.amount}</span>}
        </div>
        <div>
          <Label htmlFor="date">Data</Label>
          <Input id="date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          {errors.date && <span className="text-red-600 text-xs">{errors.date}</span>}
        </div>
        <div>
          <Label htmlFor="category">Categoria</Label>
          <select id="category" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
            <option value="">Sem categoria</option>
            {categories.filter(c => c.type === 'EXPENSE' || c.type === 'BOTH').map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="wallet">Carteira</Label>
          <select id="wallet" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.walletId} onChange={e => setForm(f => ({ ...f, walletId: e.target.value }))}>
            <option value="">Selecione</option>
            {wallets.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="tag">Tag</Label>
          <TagSelector tags={tags} value={form.tags[0] || ''} onChange={tagId => setForm(f => ({ ...f, tags: tagId ? [tagId] : [] }))} />
        </div>
      </div>
      <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Cadastrar'}</Button>
    </form>
  );
}
