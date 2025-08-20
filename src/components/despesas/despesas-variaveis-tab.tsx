// import { toTitleCase } from '@/lib/camelcase';
'use client'

import { useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Trash2, Plus } from 'lucide-react';
import { Loader } from '@/components/ui/loader';
import { Modal } from '@/components/ui/modal';
import { TagSelector } from '@/components/ui/tag-selector';
import { formatCurrency, formatDate, parseApiDate } from '@/lib/utils';


interface DespesaVariavel {
  id: string;
  description: string;
  amount: number;
  date: Date;
  categoryId?: string;
  categoryName?: string;
  walletId?: string;
  walletName?: string;
  tags: string[];
}

interface Categoria {
  id: string;
  name: string;
  type: string;
}

interface Carteira {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
}

interface DespesasVariaveisTabProps {
  currentDate: Date;
}

export default function DespesasVariaveisTab({ currentDate }: DespesasVariaveisTabProps) {
  const [despesas, setDespesas] = useState<DespesaVariavel[]>([]);
  const [search, setSearch] = useState('');
  const filteredDespesas = despesas.filter(despesa => {
    if (!search.trim()) return true;
    const s = search.trim().toLowerCase();
    if (despesa.description && despesa.description.toLowerCase().includes(s)) return true;
    if (despesa.date) {
      const d = despesa.date.getDate().toString().padStart(2, '0');
      const m = (despesa.date.getMonth() + 1).toString().padStart(2, '0');
      const y = despesa.date.getFullYear().toString();
      const full = `${d}/${m}/${y}`;
      const partial = `${d}/${m}`;
      if (full.includes(s) || partial.includes(s)) return true;
    }
    return false;
  });
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [wallets, setWallets] = useState<Carteira[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [form, setForm] = useState({ description: '', amount: '', date: '', categoryId: '', walletId: '', tags: [] as string[] });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Funções auxiliares
  const handleEdit = (id: string) => {
    const d = despesas.find(x => x.id === id);
    if (d) {
      setEditingId(id);
      setForm({
        description: d.description,
        amount: String(d.amount),
        date: d.date ? d.date.toISOString().slice(0, 10) : '',
        categoryId: d.categoryId || '',
        walletId: d.walletId || '',
        tags: d.tags || [],
      });
      setShowForm(true);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    if (res.ok) setDespesas(despesas.filter(d => d.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      description: form.description,
      amount: Number(form.amount),
      type: 'VARIABLE',
      date: form.date,
      categoryId: form.categoryId ? form.categoryId : null,
      walletId: form.walletId || undefined,
      tags: form.tags,
    };
    let res;
    if (editingId) {
      res = await fetch(`/api/expenses/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    if (res.ok) {
      const saved = await res.json();
      const item = {
        id: saved.id,
        description: saved.description,
        amount: Number(saved.amount),
        date: saved.date ? new Date(saved.date) : new Date(),
        categoryName: categories.find(c => c.id === saved.categoryId)?.name,
        categoryId: saved.categoryId,
        walletId: saved.walletId,
        walletName: wallets.find(w => w.id === saved.walletId)?.name,
        tags: saved.tags || [],
      };
      if (editingId) setDespesas(prev => prev.map(x => x.id === saved.id ? item : x));
      else setDespesas(prev => [item, ...prev]);
      setShowForm(false);
      setEditingId(null);
      setForm({ description: '', amount: '', date: '', categoryId: '', walletId: '', tags: [] });
    }
  };
  // Carrega categorias, carteiras, tags e despesas
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const start = new Date(year, month, 1).toISOString().slice(0, 10);
      const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      const [catsRes, walletsRes, tagsRes, despesasRes] = await Promise.all([
        fetch('/api/categories', { cache: 'no-store' }),
        fetch('/api/wallets', { cache: 'no-store' }),
        fetch('/api/tags', { cache: 'no-store' }),
        fetch(`/api/expenses?type=VARIABLE&start=${start}&end=${end}`, { cache: 'no-store' }),
      ]);
      if (catsRes.ok) setCategories(await catsRes.json());
      if (walletsRes.ok) setWallets(await walletsRes.json());
      if (tagsRes.ok) setTags(await tagsRes.json());
      if (despesasRes.ok) {
        const data = await despesasRes.json();
        setDespesas(data.map((e: any) => ({
          id: e.id,
          description: e.description,
          amount: Number(e.amount),
          date: e.date ? parseApiDate(e.date) : new Date(),
          categoryName: e.category?.name,
          categoryId: e.categoryId,
          walletId: e.walletId,
          tags: e.tags || [],
        })));
      }
      setIsLoading(false);
    }
    load();
  }, [currentDate]);

  // Remapeia o nome da carteira sempre que as carteiras mudam
  useEffect(() => {
    setDespesas(prev => prev.map(d => {
      const carteiraId = d.walletId ? String(d.walletId) : '';
      const carteira = carteiraId ? wallets.find(w => String(w.id) === carteiraId) : undefined;
      return {
        ...d,
        walletName: carteira ? carteira.name : (carteiraId ? '(Carteira não encontrada)' : 'Sem carteira'),
      };
    }));
  }, [wallets]);

  return (
    <div className="space-y-4 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Despesas Variáveis</h1>
          <p className="text-gray-600 dark:text-foreground">Gerencie suas despesas variáveis do mês</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ description: '', amount: '', date: '', categoryId: '', walletId: '', tags: [] }); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Despesa
        </Button>
      </div>

      {/* Busca */}
      <div className="mb-2">
        <Input
          placeholder="Buscar por descrição ou data (dd/mm/yyyy ou dd/mm)"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Modal de formulário */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditingId(null); }} title={editingId ? 'Editar Despesa' : 'Nova Despesa'}>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="amount">Valor</Label>
              <Input id="amount" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="categoryId">Categoria</Label>
              <select
                id="categoryId"
                value={form.categoryId}
                onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 dark:bg-background dark:text-foreground"
              >
                <option value="">Selecione</option>
                {categories.filter(c => c.type === 'EXPENSE' || c.type === 'BOTH').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="walletId">Carteira</Label>
              <select
                id="walletId"
                value={form.walletId}
                onChange={e => setForm(f => ({ ...f, walletId: e.target.value }))}
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 dark:bg-background dark:text-foreground"
              >
                <option value="">Selecione</option>
                {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Tags</Label>
              <TagSelector tags={tags} value={form.tags[0] || ''} onChange={tagId => setForm(f => ({ ...f, tags: tagId ? [tagId] : [] }))} />
            </div>
          </div>
          <div className="flex space-x-1 sm:space-x-2">
            <Button type="submit">{editingId ? 'Atualizar' : 'Cadastrar'}</Button>
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancelar</Button>
          </div>
        </form>
      </Modal>

      {/* Lista estilo planilha moderna */}
      {isLoading ? (
        <Loader text="Carregando despesas..." />
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
              {filteredDespesas.map((despesa) => (
                <tr key={despesa.id} className="border-b hover:bg-accent transition-colors">
                  <td className="px-3 py-2 max-w-xs truncate">{despesa.description}</td>
                  <td className="px-3 py-2 text-right text-red-600 font-semibold">{formatCurrency(despesa.amount)}</td>
                  <td className="px-3 py-2 text-center">{formatDate(despesa.date)}</td>
                  <td className="px-3 py-2 text-center">{despesa.categoryName}</td>
                  <td className="px-3 py-2 text-center">{despesa.walletName || 'Sem carteira'}</td>
                  <td className="px-3 py-2 text-center">
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(despesa.id)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(despesa.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredDespesas.length === 0 && !showForm && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">Nenhuma despesa variável cadastrada</p>
            <Button
              className="mt-4"
              onClick={() => {
                setForm({ description: '', amount: '', date: '', categoryId: '', walletId: '', tags: [] });
                setEditingId(null);
                setShowForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeira Despesa
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
