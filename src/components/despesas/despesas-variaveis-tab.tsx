'use client'

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Trash2, Plus, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Loader } from '@/components/ui/loader';

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
  // Filtro de busca
  const filteredDespesas = despesas.filter(despesa => {
    if (!search.trim()) return true;
    const s = search.trim().toLowerCase();
    // Busca por descrição
    if (despesa.description && despesa.description.toLowerCase().includes(s)) return true;
    // Busca por data (dd/mm/yyyy ou dd/mm)
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
        setDespesas(data.map((d: any) => ({
          ...d,
          date: new Date(d.date),
          tags: d.tags || [],
        })));
      }
      setIsLoading(false);
    }
    load();
  }, [currentDate]);
  // Atualiza walletName das despesas sempre que a lista de carteiras mudar
  useEffect(() => {
    if (!wallets.length || !despesas.length) return;
    setDespesas(prev => prev.map(d => ({
      ...d,
      walletName: d.walletId ? (wallets.find(w => w.id === d.walletId)?.name || 'Sem carteira') : 'Sem carteira',
    })));
  }, [wallets, despesas]);

  // Navegação de mês removida, pois agora é global

  const handleEdit = (id: string) => {
    const d = despesas.find(x => x.id === id);
    if (d) {
      const dd = d.date;
      const yyyyMMdd = dd instanceof Date ? dd.toISOString().slice(0, 10) : '';
      setEditingId(id);
      setForm({
        description: d.description,
        amount: String(d.amount),
        date: yyyyMMdd,
        categoryId: d.categoryId || '',
        walletId: d.walletId || '',
        tags: d.tags && d.tags.length > 0 ? [d.tags[0]] : [],
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
      date: form.date,
      type: 'VARIABLE',
      isFixed: false,
      categoryId: form.categoryId || undefined,
      walletId: form.walletId || undefined,
      tags: form.tags,
    };
    const res = await fetch(editingId ? `/api/expenses/${editingId}` : '/api/expenses', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const saved = await res.json();
      const item: DespesaVariavel = {
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
      setDespesas(prev => {
        if (editingId) return prev.map(x => x.id === saved.id ? item : x);
        return [item, ...prev];
      });
      setForm({ description: '', amount: '', date: '', categoryId: '', walletId: '', tags: [] });
      setEditingId(null);
      setShowForm(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Despesas Variáveis</h1>
        <p className="text-gray-600 dark:text-foreground">Gerencie suas despesas variáveis</p>
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
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? 'Editar Despesa Variável' : 'Nova Despesa Variável'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Input id="description" placeholder="Ex: Supermercado" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
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
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.categoryId}
                    onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                  >
                    <option value="">Sem categoria</option>
                    {categories
                      .filter(c => c.type === 'EXPENSE' || c.type === 'BOTH')
                      .map(c => (
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
                  <Label htmlFor="tag">Tag</Label>
                  <TagSelector tags={tags} value={form.tags[0] || ''} onChange={tagId => setForm(f => ({ ...f, tags: tagId ? [tagId] : [] }))} />
                </div>
              </div>
              <div className="flex space-x-2">
                <Button type="submit">
                  {editingId ? 'Atualizar' : 'Cadastrar'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Botão para adicionar */}
      {!showForm && (
        <Button onClick={() => {
          setForm({ description: '', amount: '', date: '', categoryId: '', walletId: '', tags: [] });
          setEditingId(null);
          setShowForm(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Despesa Variável
        </Button>
      )}

      {/* Lista de despesas */}
      {isLoading ? (
        <Loader text="Carregando despesas..." />
      ) : (
        <div className="space-y-4">
          {filteredDespesas.map((despesa) => (
            <Card key={despesa.id}>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div>
                      <h3 className="font-semibold text-lg truncate">{despesa.description}</h3>
                      <p className="text-sm text-gray-600 break-words">
                        {formatDate(despesa.date)} • {despesa.categoryName}
                      </p>
                      <p className="text-xs text-gray-500 break-words">
                        Carteira: {despesa.walletName || 'Sem carteira'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">
                        {formatCurrency(despesa.amount)}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(despesa.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(despesa.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
