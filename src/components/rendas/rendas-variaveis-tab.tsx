// import { toTitleCase } from '@/lib/camelcase';
'use client'

import { useEffect, useState } from 'react'
// import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatDate, parseApiDate } from '@/lib/utils'
import { Edit, Trash2, Plus } from 'lucide-react'
import { Loader } from '@/components/ui/loader'

interface RendaVariavel {
  id: string;
  description: string;
  amount: number;
  date: Date;
  categoryName?: string;
  categoryId?: string | null;
  walletId?: string | null;
  walletName?: string;
  tags: string[];
}
import { TagSelector } from '@/components/ui/tag-selector'


export function RendasVariaveisTab({ currentDate }: { currentDate: Date }) {
  const [rendas, setRendas] = useState<RendaVariavel[]>([]);
  const [search, setSearch] = useState('');
  // Filtro de busca
  const filteredRendas = rendas.filter(renda => {
    if (!search.trim()) return true;
    const s = search.trim().toLowerCase();
    // Busca por descrição
    if (renda.description && renda.description.toLowerCase().includes(s)) return true;
    // Busca por data (dd/mm/yyyy ou dd/mm)
    if (renda.date) {
      const d = renda.date.getDate().toString().padStart(2, '0');
      const m = (renda.date.getMonth() + 1).toString().padStart(2, '0');
      const y = renda.date.getFullYear().toString();
      const full = `${d}/${m}/${y}`;
      const partial = `${d}/${m}`;
      if (full.includes(s) || partial.includes(s)) return true;
    }
    return false;
  });
  const [categories, setCategories] = useState<Array<{ id: string; name: string; type: 'EXPENSE' | 'INCOME' | 'BOTH' }>>([]);
  const [wallets, setWallets] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState({ description: '', amount: '', date: '', categoryId: '', walletId: '', tags: [] as string[] });
  const [isLoading, setIsLoading] = useState(false);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const start = new Date(year, month, 1).toISOString().slice(0, 10);
      const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      const [catsRes, walletsRes, listRes, tagsRes] = await Promise.all([
        fetch('/api/categories', { cache: 'no-store' }),
        fetch('/api/wallets', { cache: 'no-store' }),
        fetch(`/api/incomes?type=VARIABLE&start=${start}&end=${end}`, { cache: 'no-store' }),
        fetch('/api/tags', { cache: 'no-store' }),
      ]);
      if (catsRes.ok) setCategories(await catsRes.json());
      if (walletsRes.ok) setWallets(await walletsRes.json());
      if (tagsRes.ok) setTags(await tagsRes.json());
      if (listRes.ok) {
        const data = await listRes.json();
        const mapped = data.map((e: any) => ({
          id: e.id,
          description: e.description,
          amount: Number(e.amount),
          date: parseApiDate(e.date),
          categoryName: e.category?.name,
          categoryId: e.categoryId,
          walletId: e.walletId,
          walletName: e.wallet?.name,
          tags: e.tags || [],
        }));
        setRendas(mapped);
      }
      setIsLoading(false);
    };
    load();
  }, [currentDate]);

  // mês e ano removidos, pois calendário é global

  const handleEdit = (id: string) => {
    const r = rendas.find(x => x.id === id);
    if (r) {
      const dd = r.date;
      const yyyyMMdd = dd instanceof Date ? dd.toISOString().slice(0, 10) : '';
      setEditingId(id);
      setForm({
        description: r.description,
        amount: String(r.amount),
        date: yyyyMMdd,
        categoryId: r.categoryId || '',
        walletId: r.walletId || '',
        tags: r.tags && r.tags.length > 0 ? [r.tags[0]] : [],
      });
      setShowForm(true);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/incomes/${id}`, { method: 'DELETE' });
    if (res.ok) setRendas(rendas.filter(r => r.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      description: form.description,
      amount: Number(form.amount),
      date: form.date,
      type: 'VARIABLE',
      isFixed: false,
      categoryId: form.categoryId || undefined,
      walletId: form.walletId || undefined,
      tags: form.tags,
    };
    const res = await fetch(editingId ? `/api/incomes/${editingId}` : '/api/incomes', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const saved = await res.json();
      setRendas(prev => {
        const item: RendaVariavel = {
          id: saved.id,
          description: saved.description,
          amount: Number(saved.amount),
          date: new Date(saved.date),
          categoryName: categories.find(c => c.id === saved.categoryId)?.name,
          categoryId: saved.categoryId,
          walletId: saved.walletId,
          walletName: wallets.find(w => w.id === saved.walletId)?.name,
          tags: saved.tags || [],
        };
        if (editingId) return prev.map(x => x.id === saved.id ? item : x);
        return [item, ...prev];
      });
      setForm({ description: '', amount: '', date: '', categoryId: '', walletId: '', tags: [] });
      setEditingId(null);
      setShowForm(false);
    }
  };

  return (
    <div className="space-y-4 px-2 sm:px-0">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Rendas Variáveis</h1>
        <p className="text-gray-600 dark:text-foreground">Gerencie suas rendas variáveis</p>
      </div>
      {/* Busca */}
      <div className="mb-2">
        <Input
          placeholder="Buscar por descrição ou data (dd/mm/yyyy ou dd/mm)"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      {/* Formulário */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditingId(null); }} title={editingId ? 'Editar Renda Variável' : 'Nova Renda Variável'}>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" placeholder="Ex: Freelancer" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="amount">Valor</Label>
              <Input id="amount" type="number" step="0.01" placeholder="0,00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" lang="pt-BR" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="category">Categoria</Label>
              <select
                id="category"
                value={form.categoryId}
                onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 dark:bg-background dark:text-foreground"
              >
                <option value="">Sem categoria</option>
                {categories
                  .filter(c => c.type === 'INCOME' || c.type === 'BOTH')
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
            </div>
            <div>
              <Label htmlFor="wallet">Carteira</Label>
              <select
                id="wallet"
                value={form.walletId}
                onChange={e => setForm(f => ({ ...f, walletId: e.target.value }))}
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 dark:bg-background dark:text-foreground"
              >
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
          <div className="flex space-x-1 sm:space-x-2">
            <Button type="submit">
              {editingId ? 'Atualizar' : 'Cadastrar'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowForm(false); setEditingId(null); }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
      {/* Botão para adicionar */}
      {!showForm && (
        <Button onClick={() => {
          setForm({ description: '', amount: '', date: '', categoryId: '', walletId: '', tags: [] });
          setEditingId(null);
          setShowForm(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Renda Variável
        </Button>
      )}
      {/* Lista estilo planilha moderna */}
      {isLoading ? (
        <Loader text="Carregando rendas..." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-muted bg-background">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-muted text-muted-foreground">
                <th className="px-3 py-2 text-left font-semibold">Descrição</th>
                <th className="px-3 py-2 text-right font-semibold">Valor</th>
                <th className="px-3 py-2 text-center font-semibold">Data</th>
                <th className="px-3 py-2 text-center font-semibold">Categoria</th>
                <th className="px-3 py-2 text-center font-semibold">Carteira</th>
                <th className="px-3 py-2 text-center font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredRendas.map((renda) => (
                <tr key={renda.id} className="border-b hover:bg-accent transition-colors">
                  <td className="px-3 py-2 max-w-xs truncate">{renda.description}</td>
                  <td className="px-3 py-2 text-right text-green-600 font-semibold">{formatCurrency(renda.amount)}</td>
                  <td className="px-3 py-2 text-center">{formatDate(renda.date)}</td>
                  <td className="px-3 py-2 text-center">{renda.categoryName}</td>
                  <td className="px-3 py-2 text-center">{renda.walletName || 'Sem carteira'}</td>
                  <td className="px-3 py-2 text-center">
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(renda.id)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(renda.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
