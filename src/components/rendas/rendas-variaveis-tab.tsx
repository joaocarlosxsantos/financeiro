'use client';

import React, { useEffect, useState, ChangeEvent } from 'react';
// Navegação de mês globalizada - ícones de setas padronizados no dashboard
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate, parseApiDate, formatYmd } from '@/lib/utils';
import { Edit, Trash2, Plus } from 'lucide-react';
import { Loader } from '@/components/ui/loader';

interface RendaVariavel {
  id: string;
  description: string;
  amount: number;
  date?: Date;
  categoryName?: string;
  categoryId?: string | null;
  walletId?: string | null;
  walletName?: string;
  tags: string[];
}
import { TagSelector } from '@/components/ui/tag-selector';
import { CategoryCreateModal } from '@/components/ui/category-create-modal';
import { WalletCreateModal } from '@/components/ui/wallet-create-modal';
import { TagCreateModal } from '@/components/ui/tag-create-modal';

export function RendasVariaveisTab({ currentDate }: { currentDate: Date }) {
  const [rendas, setRendas] = useState<RendaVariavel[]>([]);
  const [search, setSearch] = useState('');
  // Filtro de busca
  const filteredRendas = rendas.filter((renda: RendaVariavel) => {
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
  type Category = { id: string; name: string; type: 'EXPENSE' | 'INCOME' | 'BOTH' };
  type Wallet = { id: string; name: string };
  type Tag = { id: string; name: string };
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  type FormState = {
    description: string;
    amount: string;
    date: string;
    categoryId: string;
    walletId: string;
    tags: string[];
  };
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<FormState>({
    description: '',
    amount: '',
    date: today,
    categoryId: '',
    walletId: '',
    tags: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [errors, setErrors] = useState<{
    description?: string;
    amount?: string;
    date?: string;
    categoryId?: string;
    walletId?: string;
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
  fetch(`/api/incomes?type=VARIABLE&start=${start}&end=${end}&perPage=200`, { cache: 'no-store' }),
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
    const r = rendas.find((x: RendaVariavel) => x.id === id);
    if (r) {
      const dd = r.date;
  const yyyyMMdd = dd instanceof Date ? formatYmd(dd) : '';
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
    if (res.ok) setRendas(rendas.filter((r: RendaVariavel) => r.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors: {
      description?: string;
      amount?: string;
      date?: string;
      categoryId?: string;
      walletId?: string;
    } = {};
    if (!form.description.trim()) newErrors.description = 'Descrição é obrigatória.';
    if (!form.amount || isNaN(Number(form.amount))) newErrors.amount = 'Valor é obrigatório.';
    if (!form.date) newErrors.date = 'Data é obrigatória.';
    if (!form.categoryId) newErrors.categoryId = 'Categoria é obrigatória.';
    if (!form.walletId) newErrors.walletId = 'Carteira é obrigatória.';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    setIsLoading(true);
    const payload = {
      description: form.description,
      amount: Number(form.amount),
      type: 'VARIABLE',
      isFixed: false,
      date: form.date || undefined,
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
      setRendas((prev: RendaVariavel[]) => {
        const item: RendaVariavel = {
          id: saved.id,
          description: saved.description,
          amount: Number(saved.amount),
          date: saved.date ? parseApiDate(saved.date) : undefined,
          categoryName: categories.find((c: Category) => c.id === saved.categoryId)?.name,
          categoryId: saved.categoryId,
          walletId: saved.walletId,
          walletName: wallets.find((w: Wallet) => w.id === saved.walletId)?.name,
          tags: saved.tags || [],
        };
        if (editingId) return prev.map((x: RendaVariavel) => (x.id === saved.id ? item : x));
        return [item, ...prev];
      });
      setForm({ description: '', amount: '', date: '', categoryId: '', walletId: '', tags: [] });
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Rendas Variáveis</h1>
          <p className="text-gray-600 dark:text-foreground">Gerencie suas rendas variáveis</p>
        </div>
        <Button
          onClick={() => {
            setForm({
              description: '',
              amount: '',
              date: today,
              categoryId: '',
              walletId: '',
              tags: [],
            });
            setEditingId(null);
            setShowForm(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> Adicionar Renda Variável
        </Button>
      </div>
      {/* Formulário */}
      {/* Formulário */}
      <Modal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingId(null);
        }}
        title={editingId ? 'Editar Renda Variável' : 'Nova Renda Variável'}
      >
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Ex: Freelancer"
                value={form.description}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setForm((f: FormState) => ({ ...f, description: e.target.value }))
                }
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
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setForm((f: FormState) => ({ ...f, amount: e.target.value }))
                }
              />
              {errors.amount && <span className="text-red-600 text-xs">{errors.amount}</span>}
            </div>
            <div>
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                lang="pt-BR"
                value={form.date}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setForm((f: FormState) => ({ ...f, date: e.target.value }))
                }
              />
              {errors.date && <span className="text-red-600 text-xs">{errors.date}</span>}
            </div>
            <div>
              <Label htmlFor="category">Categoria</Label>
              <select
                id="category"
                value={form.categoryId}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                  if (e.target.value === '__create__') {
                    setShowCategoryModal(true);
                  } else {
                    setForm((f: FormState) => ({ ...f, categoryId: e.target.value }));
                  }
                }}
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 dark:bg-background dark:text-foreground"
              >
                <option value="__create__">➕ Criar categoria</option>
                <option value="">Selecione</option>
                {categories
                  .filter((c: Category) => c.type === 'INCOME' || c.type === 'BOTH')
                  .map((c: Category) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
              {errors.categoryId && (
                <span className="text-red-600 text-xs">{errors.categoryId}</span>
              )}
            </div>
            <div>
              <Label htmlFor="wallet">Carteira</Label>
              <select
                id="wallet"
                value={form.walletId}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                  if (e.target.value === '__create__') {
                    setShowWalletModal(true);
                  } else {
                    setForm((f: FormState) => ({ ...f, walletId: e.target.value }));
                  }
                }}
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 dark:bg-background dark:text-foreground"
              >
                <option value="__create__">➕ Criar carteira</option>
                <option value="">Selecione</option>
                {wallets.map((w: Wallet) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              {errors.walletId && <span className="text-red-600 text-xs">{errors.walletId}</span>}
            </div>
            <div>
              <Label htmlFor="tag">Tag</Label>
              <div className="flex gap-2">
                <select
                  id="tag"
                  value={form.tags[0] || ''}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                    if (e.target.value === '__create__') {
                      setShowTagModal(true);
                    } else {
                      setForm((f: FormState) => ({
                        ...f,
                        tags: e.target.value ? [e.target.value] : [],
                      }));
                    }
                  }}
                  className="flex-1 rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 dark:bg-background dark:text-foreground"
                >
                  <option value="__create__">➕ Criar tag</option>
                  <option value="">Sem tag</option>
                  {tags.map((tag: Tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </div>
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
                <th className="px-3 py-2 text-center font-semibold">Data</th>
                <th className="px-3 py-2 text-center font-semibold">Categoria</th>
                <th className="px-3 py-2 text-center font-semibold">Carteira</th>
                <th className="px-3 py-2 text-center font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredRendas.map((renda: RendaVariavel) => (
                <tr key={renda.id} className="border-b hover:bg-accent transition-colors">
                  <td className="px-3 py-2 max-w-xs truncate">{renda.description}</td>
                  <td className="px-3 py-2 text-right text-green-600 font-semibold">
                    {formatCurrency(renda.amount)}
                  </td>
                  <td className="px-3 py-2 text-center">{renda.date ? formatDate(renda.date) : '-'}</td>
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
