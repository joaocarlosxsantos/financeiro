'use client';

import React, { useEffect, useState, ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate, parseApiDate, formatYmd } from '@/lib/utils';
import { Edit, Trash2, Plus } from 'lucide-react';
import { Loader } from '@/components/ui/loader';

interface RendaFixa {
  id: string;
  description: string;
  amount: number;
  dayOfMonth: number;
  categoryName?: string;
  categoryId?: string | null;
  walletId?: string | null;
  walletName?: string;
  startDate?: Date;
  endDate?: Date;
  tagId?: string | null;
  tags: string[];
}

import { TagSelector } from '@/components/ui/tag-selector';
import { CategoryCreateModal } from '@/components/ui/category-create-modal';
import { WalletCreateModal } from '@/components/ui/wallet-create-modal';
import { TagCreateModal } from '@/components/ui/tag-create-modal';

export function RendasFixasTab({ currentDate }: { currentDate: Date }) {
  const [rendas, setRendas] = useState<RendaFixa[]>([]);
  const [search, setSearch] = useState('');
  // Filtro de busca
  const filteredRendas = rendas.filter((renda: RendaFixa) => {
    if (!search.trim()) return true;
    const s = search.trim().toLowerCase();
    // Busca por descrição
    if (renda.description && renda.description.toLowerCase().includes(s)) return true;
    // Busca por data (dd/mm/yyyy ou dd/mm)
    if (renda.dayOfMonth && renda.startDate) {
      const d = renda.dayOfMonth.toString().padStart(2, '0');
      const m = (renda.startDate.getMonth() + 1).toString().padStart(2, '0');
      const y = renda.startDate.getFullYear().toString();
      const full = `${d}/${m}/${y}`;
      const partial = `${d}/${m}`;
      if (full.includes(s) || partial.includes(s)) return true;
    }
    return false;
  });
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string; type: 'EXPENSE' | 'INCOME' | 'BOTH' }>
  >([]);
  const [wallets, setWallets] = useState<Array<{ id: string; name: string }>>([]);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    dayOfMonth: '',
    categoryId: '',
    walletId: '',
    startDate: '',
    endDate: '',
    tags: [] as string[],
  });
  const [errors, setErrors] = useState<{
    description?: string;
    amount?: string;
    dayOfMonth?: string;
  }>({});
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
  const { formatYmd } = await import('@/lib/utils');
  const start = formatYmd(new Date(year, month, 1));
  const end = formatYmd(new Date(year, month + 1, 0));
      const [catsRes, walletsRes, listRes, tagsRes] = await Promise.all([
        fetch('/api/categories', { cache: 'no-store' }),
        fetch('/api/wallets', { cache: 'no-store' }),
        fetch(`/api/incomes?type=FIXED&start=${start}&end=${end}`, { cache: 'no-store' }),
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
          dayOfMonth: e.dayOfMonth ?? 1,
          categoryName: e.category?.name,
          categoryId: e.categoryId,
          walletId: e.walletId,
          walletName: e.wallet?.name,
          // A API expande rendas FIXED em ocorrências com campo `date`; startDate/endDate podem existir
          startDate: e.date ? parseApiDate(e.date) : e.startDate ? parseApiDate(e.startDate) : undefined,
          endDate: e.endDate ? parseApiDate(e.endDate) : undefined,
          tags: e.tags || [],
        }));
        setRendas(mapped);
      }
      setIsLoading(false);
    };
    load();
  }, [currentDate]);

  const handleEdit = (id: string) => {
    const r = rendas.find((x: RendaFixa) => x.id === id);
    if (r) {
      setEditingId(id);
      setForm({
        description: r.description,
        amount: String(r.amount),
        dayOfMonth: String(r.dayOfMonth ?? ''),
        categoryId: r.categoryId || '',
        walletId: r.walletId || '',
  startDate: r.startDate ? (r.startDate instanceof Date ? formatYmd(r.startDate) : r.startDate) : '',
  endDate: r.endDate ? (r.endDate instanceof Date ? formatYmd(r.endDate) : r.endDate) : '',
        tags: r.tags && r.tags.length > 0 ? [r.tags[0]] : [],
      });
      setShowForm(true);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/incomes/${id}`, { method: 'DELETE' });
    if (res.ok) setRendas(rendas.filter((r: RendaFixa) => r.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors: { description?: string; amount?: string; dayOfMonth?: string } = {};
    if (!form.description.trim()) newErrors.description = 'Descrição é obrigatória.';
    if (!form.amount || isNaN(Number(form.amount))) newErrors.amount = 'Valor é obrigatório.';
    if (!form.dayOfMonth || isNaN(Number(form.dayOfMonth)))
      newErrors.dayOfMonth = 'Dia do mês é obrigatório.';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    const payload = {
      description: form.description,
      amount: Number(form.amount),
      type: 'FIXED',
      isFixed: true,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      dayOfMonth: form.dayOfMonth ? Number(form.dayOfMonth) : undefined,
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
      setRendas((prev: RendaFixa[]) => {
        const item: RendaFixa = {
          id: saved.id,
          description: saved.description,
          amount: Number(saved.amount),
          dayOfMonth: saved.dayOfMonth ?? 1,
          categoryName: categories.find((c) => c.id === saved.categoryId)?.name,
          categoryId: saved.categoryId,
          walletId: saved.walletId,
          walletName: wallets.find((w) => w.id === saved.walletId)?.name,
          startDate: saved.startDate ? parseApiDate(saved.startDate) : undefined,
          endDate: saved.endDate ? parseApiDate(saved.endDate) : undefined,
          tags: saved.tags || [],
        };
        if (editingId) return prev.map((x) => (x.id === saved.id ? item : x));
        return [item, ...prev];
      });
      setForm({
        description: '',
        amount: '',
        dayOfMonth: '',
        categoryId: '',
        walletId: '',
        startDate: '',
        endDate: '',
        tags: [],
      });
      setEditingId(null);
      setShowForm(false);
      setErrors({});
    }
  };

  return (
    <div className="space-y-4 px-2 sm:px-0">
      {/* Header com botão adicionar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Rendas Fixas</h1>
          <p className="text-gray-600 dark:text-foreground">Gerencie suas rendas fixas</p>
        </div>
        <Button
          onClick={() => {
            setForm({
              description: '',
              amount: '',
              dayOfMonth: '',
              categoryId: '',
              walletId: '',
              startDate: '',
              endDate: '',
              tags: [],
            });
            setEditingId(null);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Entrada Fixa
        </Button>
      </div>
      {/* Busca */}
      <div className="mb-2">
        <Input
          placeholder="Buscar por descrição ou data (dd/mm/yyyy ou dd/mm)"
          value={search}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
        />
      </div>
      {/* Formulário */}
      <Modal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingId(null);
        }}
        title={editingId ? 'Editar Renda Fixa' : 'Nova Renda Fixa'}
      >
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Ex: Salário"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
              {errors.description && (
                <span className="text-red-600 text-xs">{errors.description}</span>
              )}
            </div>
            <div>
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
              {errors.amount && <span className="text-red-600 text-xs">{errors.amount}</span>}
            </div>
            <div>
              <Label htmlFor="dayOfMonth">Dia do mês</Label>
              <Input
                id="dayOfMonth"
                type="number"
                min="1"
                max="31"
                placeholder="25"
                value={form.dayOfMonth}
                onChange={(e) => setForm((f) => ({ ...f, dayOfMonth: e.target.value }))}
              />
              {errors.dayOfMonth && (
                <span className="text-red-600 text-xs">{errors.dayOfMonth}</span>
              )}
            </div>
            <div>
              <Label htmlFor="category">Categoria</Label>
              <select
                id="category"
                value={form.categoryId}
                onChange={(e) => {
                  if (e.target.value === '__create__') {
                    setShowCategoryModal(true);
                  } else {
                    setForm((f) => ({ ...f, categoryId: e.target.value }));
                  }
                }}
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 dark:bg-background dark:text-foreground"
              >
                <option value="__create__">➕ Criar categoria</option>
                <option value="">Sem categoria</option>
                {categories
                  .filter((c) => c.type === 'INCOME' || c.type === 'BOTH')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <Label htmlFor="wallet">Carteira</Label>
              <select
                id="wallet"
                value={form.walletId}
                onChange={(e) => {
                  if (e.target.value === '__create__') {
                    setShowWalletModal(true);
                  } else {
                    setForm((f) => ({ ...f, walletId: e.target.value }));
                  }
                }}
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 dark:bg-background dark:text-foreground"
              >
                <option value="__create__">➕ Criar carteira</option>
                <option value="">Selecione</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="tag">Tag</Label>
              <div className="flex gap-2">
                <select
                  id="tag"
                  value={form.tags[0] || ''}
                  onChange={(e) => {
                    if (e.target.value === '__create__') {
                      setShowTagModal(true);
                    } else {
                      setForm((f) => ({ ...f, tags: e.target.value ? [e.target.value] : [] }));
                    }
                  }}
                  className="flex-1 rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 dark:bg-background dark:text-foreground"
                >
                  <option value="__create__">➕ Criar tag</option>
                  <option value="">Sem tag</option>
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="startDate">Data de Início</Label>
              <Input
                id="startDate"
                type="date"
                lang="pt-BR"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Data de Fim (Opcional)</Label>
              <Input
                id="endDate"
                type="date"
                lang="pt-BR"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex space-x-1 sm:space-x-2">
            <Button type="submit">{editingId ? 'Atualizar' : 'Cadastrar'}</Button>
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
      </Modal>
      {/* Modais de criação */}
      <CategoryCreateModal
        open={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onCreated={(id) => {
          setShowCategoryModal(false);
          fetch('/api/categories', { cache: 'no-store' }).then(async (res) => {
            if (res.ok) setCategories(await res.json());
          });
          if (id) setForm((f) => ({ ...f, categoryId: id }));
        }}
      />
      <WalletCreateModal
        open={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onCreated={(id) => {
          setShowWalletModal(false);
          fetch('/api/wallets', { cache: 'no-store' }).then(async (res) => {
            if (res.ok) setWallets(await res.json());
          });
          if (id) setForm((f) => ({ ...f, walletId: id }));
        }}
      />
      <TagCreateModal
        open={showTagModal}
        onClose={() => setShowTagModal(false)}
        onCreated={(id) => {
          setShowTagModal(false);
          fetch('/api/tags', { cache: 'no-store' }).then(async (res) => {
            if (res.ok) setTags(await res.json());
          });
          if (id) setForm((f) => ({ ...f, tags: id ? [id] : [] }));
        }}
      />
      {/* Botão para adicionar removido, agora está no header */}
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
                <th className="px-3 py-2 text-center font-semibold">Dia do mês</th>
                <th className="px-3 py-2 text-center font-semibold">Categoria</th>
                <th className="px-3 py-2 text-center font-semibold">Carteira</th>
                <th className="px-3 py-2 text-center">Início</th>
                <th className="px-3 py-2 text-center">Fim</th>
                <th className="px-3 py-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredRendas.map((renda) => (
                <tr key={renda.id} className="border-b hover:bg-accent transition-colors">
                  <td className="px-3 py-2 max-w-xs truncate">{renda.description}</td>
                  <td className="px-3 py-2 text-right text-green-600 font-semibold">
                    {formatCurrency(renda.amount)}
                  </td>
                  <td className="px-3 py-2 text-center">{renda.dayOfMonth}</td>
                  <td className="px-3 py-2 text-center">{renda.categoryName}</td>
                  <td className="px-3 py-2 text-center">{renda.walletName || 'Sem carteira'}</td>
                  <td className="px-3 py-2 text-center">{renda.startDate ? formatDate(renda.startDate) : '-'}</td>
                  <td className="px-3 py-2 text-center">
                    {renda.endDate ? formatDate(renda.endDate) : '-'}
                  </td>
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
