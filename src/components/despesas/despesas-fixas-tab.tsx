'use client';

import React, { useEffect, useMemo, useState, ChangeEvent } from 'react';
import { CategoryCreateModal } from '@/components/ui/category-create-modal';
import { WalletCreateModal } from '@/components/ui/wallet-create-modal';
import { TagCreateModal } from '@/components/ui/tag-create-modal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate, parseApiDate, formatYmd } from '@/lib/utils';
import { TagSelector } from '@/components/ui/tag-selector';
import { Edit, Trash2, Plus, Calendar } from 'lucide-react';

import { Loader } from '@/components/ui/loader';

interface DespesaFixa {
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
  tags: string[];
}

interface DespesasFixasTabProps {
  currentDate: Date;
}

export function DespesasFixasTab({ currentDate }: DespesasFixasTabProps) {
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [despesas, setDespesas] = useState<DespesaFixa[]>([]);
  const [search, setSearch] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  // Filtro de busca
  const filteredDespesas = despesas.filter((despesa) => {
    if (!search.trim()) return true;
    const s = search.trim().toLowerCase();
    // Busca por descrição
    if (despesa.description && despesa.description.toLowerCase().includes(s)) return true;
    // Busca por data (dd/mm/yyyy ou dd/mm)
    if (despesa.dayOfMonth && despesa.startDate) {
      const d = despesa.dayOfMonth.toString().padStart(2, '0');
      const m = (despesa.startDate.getMonth() + 1).toString().padStart(2, '0');
      const y = despesa.startDate.getFullYear().toString();
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
  const [isLoading, setIsLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    dayOfMonth: '',
    categoryId: '',
    walletId: '',
    startDate: today,
    endDate: today,
    tags: [] as string[],
  });

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
  fetch(`/api/expenses?type=FIXED&start=${start}&end=${end}&perPage=200`, { cache: 'no-store' }),
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
          walletName: e.wallet?.name || 'N/A',
          startDate: e.startDate ? parseApiDate(e.startDate) : undefined,
          endDate: e.endDate ? parseApiDate(e.endDate) : undefined,
          tags: e.tags || [],
        }));
        setDespesas(mapped);
      }
      setIsLoading(false);
    };
    load();
  }, [currentDate]);

  // Navegação de mês removida, pois agora é global

  const handleEdit = (id: string) => {
    const d = despesas.find((x) => x.id === id);
    if (d) {
      setEditingId(id);
      setForm({
        description: d.description,
        amount: String(d.amount),
        dayOfMonth: String(d.dayOfMonth ?? ''),
        categoryId: d.categoryId || '',
        walletId: d.walletId || '',
  startDate: d.startDate ? (d.startDate instanceof Date ? formatYmd(d.startDate) : d.startDate) : '',
  endDate: d.endDate ? (d.endDate instanceof Date ? formatYmd(d.endDate) : d.endDate) : '',
        tags: d.tags && d.tags.length > 0 ? [d.tags[0]] : [],
      });
      setShowForm(true);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    if (res.ok) setDespesas(despesas.filter((d) => d.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};
    if (!form.description) newErrors.description = 'Descrição é obrigatória.';
    if (!form.amount) newErrors.amount = 'Valor é obrigatório.';
    if (!form.dayOfMonth) newErrors.dayOfMonth = 'Dia do mês é obrigatório.';
    if (!form.walletId) newErrors.walletId = 'Carteira é obrigatória.';
    if (!form.categoryId) newErrors.categoryId = 'Categoria é obrigatória.';
    if (!form.startDate) newErrors.startDate = 'Data de início é obrigatória.';
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
      categoryId: form.categoryId ? form.categoryId : null,
      walletId: form.walletId || undefined,
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
        dayOfMonth: saved.dayOfMonth ?? 1,
        categoryName: categories.find((c) => c.id === saved.categoryId)?.name,
        categoryId: saved.categoryId,
        walletId: saved.walletId,
        walletName: wallets.find((w) => w.id === saved.walletId)?.name,
  startDate: saved.startDate ? parseApiDate(saved.startDate) : undefined,
  endDate: saved.endDate ? parseApiDate(saved.endDate) : undefined,
        tags: saved.tags || [],
      };
      if (editingId) setDespesas((prev) => prev.map((x) => (x.id === saved.id ? item : x)));
      else setDespesas((prev) => [item, ...prev]);
      setShowForm(false);
      setEditingId(null);
      setForm({
        description: '',
        amount: '',
        dayOfMonth: '',
        categoryId: '',
        walletId: '',
        startDate: today,
        endDate: today,
        tags: [],
      });
      setErrors({});
    }
  };

  return (
    <div className="space-y-4 px-2 sm:px-0">
      {/* Header com botão adicionar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Despesas Fixas</h1>
          <p className="text-gray-600 dark:text-foreground">Gerencie suas despesas fixas</p>
        </div>
        <Button
            onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setForm({
              description: '',
              amount: '',
              dayOfMonth: '',
              categoryId: '',
              walletId: '',
              startDate: today,
              endDate: today,
              tags: [],
            });
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> Adicionar Saída Fixa
        </Button>
      </div>
      {/* Busca */}
      <div className="mb-2">
        <Input
          placeholder="Buscar por descrição ou data (dd/mm/yyyy ou dd/mm)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {/* Modal de formulário */}
      <Modal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingId(null);
        }}
        title={editingId ? 'Editar Despesa Fixa' : 'Nova Despesa Fixa'}
      >
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Ex: Aluguel"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
              {errors.description && (
                <p className="text-red-500 text-xs mt-1">{errors.description}</p>
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
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
            </div>
            <div>
              <Label htmlFor="dayOfMonth">Dia do mês</Label>
              <Input
                id="dayOfMonth"
                type="number"
                min="1"
                max="31"
                placeholder="5"
                value={form.dayOfMonth}
                onChange={(e) => setForm((f) => ({ ...f, dayOfMonth: e.target.value }))}
              />
              {errors.dayOfMonth && (
                <p className="text-red-500 text-xs mt-1">{errors.dayOfMonth}</p>
              )}
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
              {errors.walletId && <p className="text-red-500 text-xs mt-1">{errors.walletId}</p>}
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
                  .filter((c) => c.type === 'EXPENSE' || c.type === 'BOTH')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
              {errors.categoryId && (
                <p className="text-red-500 text-xs mt-1">{errors.categoryId}</p>
              )}
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
            </div>
            <div>
              <Label htmlFor="startDate">Data de início</Label>
              <Input
                id="startDate"
                type="date"
                lang="pt-BR"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
              {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
            </div>
            <div>
              <Label htmlFor="endDate">Data de fim (opcional)</Label>
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
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
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
                <th className="px-3 py-2 text-center font-semibold">Dia do mês</th>
                <th className="px-3 py-2 text-center font-semibold">Categoria</th>
                <th className="px-3 py-2 text-center font-semibold">Carteira</th>
                <th className="px-3 py-2 text-center">Início</th>
                <th className="px-3 py-2 text-center">Fim</th>
                <th className="px-3 py-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredDespesas.map((despesa) => (
                <tr key={despesa.id} className="border-b hover:bg-accent transition-colors">
                  <td className="px-3 py-2 max-w-xs truncate">{despesa.description}</td>
                  <td className="px-3 py-2 text-right text-red-600 font-semibold">
                    {formatCurrency(despesa.amount)}
                  </td>
                  <td className="px-3 py-2 text-center">{despesa.dayOfMonth}</td>
                  <td className="px-3 py-2 text-center">{despesa.categoryName}</td>
                  <td className="px-3 py-2 text-center">{despesa.walletName || 'Sem carteira'}</td>
                  <td className="px-3 py-2 text-center">{despesa.startDate ? formatDate(despesa.startDate) : '-'}</td>
                  <td className="px-3 py-2 text-center">
                    {despesa.endDate ? formatDate(despesa.endDate) : '-'}
                  </td>
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
    </div>
  );
}
