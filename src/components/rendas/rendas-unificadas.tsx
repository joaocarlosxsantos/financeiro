// Componente unificado de rendas variáveis e fixas
'use client';

import React, { useEffect, useState } from 'react';
import { stableSortByDateDesc } from '@/lib/sort';
import { CategoryCreateModal } from '@/components/ui/category-create-modal';
import { WalletCreateModal } from '@/components/ui/wallet-create-modal';
import { TagCreateModal } from '@/components/ui/tag-create-modal';
import { MultiTagSelector } from '@/components/ui/multi-tag-selector';
import { SmartSuggestionsCard } from '@/components/ui/smart-suggestions-card';
import { useSmartSuggestions } from '@/hooks/use-smart-suggestions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Trash2, Plus } from 'lucide-react';
import { Loader } from '@/components/ui/loader';
import { Modal } from '@/components/ui/modal';
import { formatCurrency, formatDate, parseApiDate, formatYmd } from '@/lib/utils';

interface Tag {
  id: string;
  name: string;
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

interface CreditCard {
  id: string;
  name: string;
  bank: { name: string };
}

interface Renda {
  id: string;
  description: string;
  amount: number;
  date?: Date;
  dayOfMonth?: number;
  categoryId?: string;
  categoryName?: string;
  walletId?: string;
  walletName?: string;
  creditCardId?: string;
  creditCardName?: string;
  paymentType?: string;
  tags: string[];
  isFixed: boolean;
  endDate?: Date | null;
}

export default function RendasUnificadas({ currentDate, defaultDate }: { currentDate: Date; defaultDate?: string }) {
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [rendas, setRendas] = useState<Renda[]>([]);
  const [search, setSearch] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [wallets, setWallets] = useState<Carteira[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const today = defaultDate ?? new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    date: today,
    categoryId: '',
    paymentType: 'DEBIT',
    walletId: '',
    creditCardId: '',
    tags: [] as string[],
    isFixed: false,
    endDate: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Hook de sugestões inteligentes
  const smartSuggestions = useSmartSuggestions({
    description: form.description,
    transactionType: 'INCOME',
    categories: categories,
    tags: tags,
    debounceMs: 1000,
    onCategoryPreselect: (categoryId) => {
      setForm(f => ({ ...f, categoryId }));
    },
    onTagsPreselect: (tagIds) => {
      setForm(f => ({ ...f, tags: [...f.tags, ...tagIds.filter(id => !f.tags.includes(id))] }));
    }
  });

  // Carregar rendas fixas e variáveis juntas
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
  const { formatYmd } = await import('@/lib/utils');
  const start = formatYmd(new Date(year, month, 1));
  const end = formatYmd(new Date(year, month + 1, 0));
      const [catsRes, walletsRes, tagsRes, creditCardsRes, variaveisRes, fixasRes] = await Promise.all([
        fetch('/api/categories', { cache: 'no-store' }),
        fetch('/api/wallets', { cache: 'no-store' }),
        fetch('/api/tags', { cache: 'no-store' }),
        fetch('/api/credit-cards', { cache: 'no-store' }),
        fetch(`/api/incomes?type=VARIABLE&start=${start}&end=${end}&perPage=200`, { cache: 'no-store' }),
        fetch(`/api/incomes?type=FIXED&start=${start}&end=${end}&perPage=200`, { cache: 'no-store' }),
      ]);
      if (catsRes.ok) setCategories(await catsRes.json());
      if (walletsRes.ok) setWallets(await walletsRes.json());
      if (tagsRes.ok) setTags(await tagsRes.json());
      if (creditCardsRes.ok) setCreditCards(await creditCardsRes.json());
      let rendasVar: Renda[] = [];
      let rendasFix: Renda[] = [];
      if (variaveisRes.ok) {
        const data = await variaveisRes.json();
        rendasVar = data.map((e: any) => ({
          id: e.id,
          description: e.description,
          amount: Number(e.amount),
          // Preferir a data da ocorrência retornada pela API (e.date). Se ausente, usar date/string original.
          date: e.date ? parseApiDate(e.date) : e.startDate ? parseApiDate(e.startDate) : undefined,
          endDate: e.endDate ? parseApiDate(e.endDate) : undefined,
          categoryName: e.category?.name,
          categoryId: e.categoryId,
          walletId: e.walletId,
          walletName: e.wallet?.name,
          creditCardId: e.creditCardId,
          creditCardName: e.creditCard?.name,
          paymentType: e.paymentType || 'DEBIT',
          tags: e.tags || [],
          isFixed: false,
        }));
      }
      if (fixasRes.ok) {
        const data = await fixasRes.json();
        rendasFix = data.map((e: any) => ({
          id: e.id,
          description: e.description,
          amount: Number(e.amount),
          // Quando a API expande FIXED ela retorna cada ocorrência com `date` — prefira isso.
          date: e.date ? parseApiDate(e.date) : e.startDate ? parseApiDate(e.startDate) : undefined,
          endDate: e.endDate ? parseApiDate(e.endDate) : undefined,
          dayOfMonth: e.dayOfMonth,
          categoryName: e.category?.name,
          categoryId: e.categoryId,
          walletId: e.walletId,
          walletName: e.wallet?.name,
          creditCardId: e.creditCardId,
          creditCardName: e.creditCard?.name,
          paymentType: e.paymentType || 'DEBIT',
          tags: e.tags || [],
          isFixed: true,
        }));
      }
      // Combinar variáveis e fixas e ordenar apenas por data (desc). Preservar ordem original quando datas empatam.
      const combined = [...rendasVar, ...rendasFix];
      setRendas(stableSortByDateDesc(combined, (it) => it?.date));
      setIsLoading(false);
    }
    load();
  }, [currentDate]);

  // Filtro de busca
  const filteredRendas = rendas.filter((renda) => {
    if (!search.trim()) return true;
    const s = search.trim().toLowerCase();
    if (renda.description && renda.description.toLowerCase().includes(s)) return true;
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

  // Editar renda
  const handleEdit = (id: string) => {
    const d = rendas.find((x) => x.id === id);
    if (d) {
      setEditingId(id);
      setForm({
        description: d.description,
        amount: String(d.amount),
        date: d.date ? (d.date instanceof Date ? formatYmd(d.date) : d.date) : '',
        categoryId: d.categoryId || '',
        paymentType: d.paymentType || 'DEBIT',
        walletId: d.walletId || '',
        creditCardId: d.creditCardId || '',
        tags: d.tags || [],
        isFixed: d.isFixed,
        endDate: d.endDate ? (d.endDate instanceof Date ? formatYmd(d.endDate) : d.endDate) : '',
      });
      setErrors({});
      setShowForm(true);
    }
  };

  // Deletar renda
  const handleDelete = async (id: string) => {
    await fetch(`/api/incomes/${id}`, { method: 'DELETE' });
    setRendas(rendas.filter((d) => d.id !== id));
  };

  // Submissão do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};
    if (!form.description) newErrors.description = 'Descrição é obrigatória.';
    if (!form.amount || isNaN(Number(form.amount))) newErrors.amount = 'Valor é obrigatório.';
    if (!form.date) newErrors.date = 'Data é obrigatória.';
    if (form.paymentType === 'CREDIT') {
      if (!form.creditCardId) newErrors.creditCardId = 'Cartão de crédito é obrigatório.';
    } else {
      if (!form.walletId) newErrors.walletId = 'Carteira é obrigatória.';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    // Processar tags sugeridas - criar tags que ainda não existem
    const processedTags: string[] = [];
    for (const tagId of form.tags) {
      if (tagId.startsWith('suggested:')) {
        // É uma tag sugerida, precisa criar
        const tagName = tagId.replace('suggested:', '');
        try {
          const response = await fetch('/api/tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: tagName })
          });
          if (response.ok) {
            const newTag = await response.json();
            setTags(prev => [...prev, newTag]);
            processedTags.push(newTag.id);
          } else {
            console.error('Erro ao criar tag sugerida:', tagName);
            // Se não conseguir criar, ignora a tag
          }
        } catch (error) {
          console.error('Erro ao criar tag sugerida:', tagName, error);
          // Se não conseguir criar, ignora a tag
        }
      } else {
        // Tag normal, mantém o ID
        processedTags.push(tagId);
      }
    }

    // Criar categoria sugerida se necessário
    let finalCategoryId: string | null = form.categoryId;
    if (form.categoryId?.startsWith('suggested:')) {
      const categoryName = form.categoryId.replace('suggested:', '');
      try {
        const response = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: categoryName, 
            type: 'INCOME',
            color: '#10B981' // cor verde padrão para categorias de renda sugeridas
          })
        });
        if (response.ok) {
          const newCategory = await response.json();
          setCategories(prev => [...prev, newCategory]);
          finalCategoryId = newCategory.id;
        } else {
          console.error('Erro ao criar categoria sugerida:', categoryName);
          finalCategoryId = null;
        }
      } catch (error) {
        console.error('Erro ao criar categoria sugerida:', categoryName, error);
        finalCategoryId = null;
      }
    }

    const payload = {
      description: form.description,
      amount: Number(form.amount),
      date: form.date,
      type: form.isFixed ? ('FIXED' as 'FIXED' | 'VARIABLE') : ('VARIABLE' as 'FIXED' | 'VARIABLE'),
      isFixed: form.isFixed,
      endDate: form.endDate || null,
      categoryId: finalCategoryId || null,
      paymentType: form.paymentType,
      walletId: form.paymentType === 'CREDIT' ? null : (form.walletId || null),
      creditCardId: form.paymentType === 'CREDIT' ? (form.creditCardId || null) : null,
      tags: processedTags,
    };
    let res;
    if (editingId) {
      res = await fetch(`/api/incomes/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch('/api/incomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    if (res.ok) {
      // read returned item if API returns it (preferable)
      let returned: any = null;
      try {
        returned = await res.json();
      } catch (err) {
        // ignore json parse errors
      }

      // capturar se estávamos editando antes de resetar
      const wasEditing = editingId;
      setShowForm(false);
      setEditingId(null);
      setForm({
        description: '',
        amount: '',
        date: today,
        categoryId: '',
        paymentType: 'DEBIT',
        walletId: '',
        creditCardId: '',
        tags: [],
        isFixed: false,
        endDate: '',
      });
      setErrors({});

      // If the API returned the created/updated item and it's VARIABLE, update local state
      if (returned) {
        const item = {
          id: returned.id,
          description: returned.description,
          amount: Number(returned.amount),
          date: returned.date ? parseApiDate(returned.date) : returned.startDate ? parseApiDate(returned.startDate) : undefined,
          categoryName: returned.category?.name,
          categoryId: returned.categoryId,
          walletId: returned.walletId,
          walletName: returned.wallet?.name,
          creditCardId: returned.creditCardId,
          creditCardName: returned.creditCard?.name,
          paymentType: returned.paymentType || 'DEBIT',
          tags: returned.tags || [],
          isFixed: returned.type === 'FIXED' || returned.isFixed === true,
        } as Renda;

        if (!item.isFixed) {
          // VARIABLE: update or insert into local state and keep stable ordering
          setRendas((prev) => {
            if (wasEditing) {
              const idx = prev.findIndex((r) => String(r.id) === String(item.id));
              if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = item;
                return stableSortByDateDesc(copy, (it) => it?.date);
              }
              return stableSortByDateDesc([...prev, item], (it) => it?.date);
            }
            const without = prev.filter((r) => r.id !== item.id);
            const combined = [...without, item];
            return stableSortByDateDesc(combined, (it) => it?.date);
          });
          // done — no need to re-fetch
          return;
        }
        // else: fallthrough to full reload for FIXED
      }

      // For FIXED (or if API didn't return item), reload both lists (use perPage=200)
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const start = new Date(year, month, 1).toISOString().slice(0, 10);
      const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      const [variaveisRes, fixasRes] = await Promise.all([
        fetch(`/api/incomes?type=VARIABLE&start=${start}&end=${end}&perPage=200`, { cache: 'no-store' }),
        fetch(`/api/incomes?type=FIXED&start=${start}&end=${end}&perPage=200`, { cache: 'no-store' }),
      ]);
      let rendasVar: Renda[] = [];
      let rendasFix: Renda[] = [];
      if (variaveisRes.ok) {
        const data = await variaveisRes.json();
        rendasVar = data.map((e: any) => ({
          id: e.id,
          description: e.description,
          amount: Number(e.amount),
          date: e.date ? parseApiDate(e.date) : e.startDate ? parseApiDate(e.startDate) : undefined,
          categoryName: e.category?.name,
          categoryId: e.categoryId,
          walletId: e.walletId,
          walletName: e.wallet?.name,
          creditCardId: e.creditCardId,
          creditCardName: e.creditCard?.name,
          paymentType: e.paymentType || 'DEBIT',
          tags: e.tags || [],
          isFixed: false,
        }));
      }
      if (fixasRes.ok) {
        const data = await fixasRes.json();
        rendasFix = data.map((e: any) => ({
          id: e.id,
          description: e.description,
          amount: Number(e.amount),
          date: e.date ? parseApiDate(e.date) : e.startDate ? parseApiDate(e.startDate) : undefined,
          dayOfMonth: e.dayOfMonth,
          categoryName: e.category?.name,
          categoryId: e.categoryId,
          walletId: e.walletId,
          walletName: e.wallet?.name,
          creditCardId: e.creditCardId,
          creditCardName: e.creditCard?.name,
          paymentType: e.paymentType || 'DEBIT',
          tags: e.tags || [],
          isFixed: true,
        }));
      }
      // Ao recarregar após criação/edição, aplicar a ordenação estável por data
      const combinedAfter = [...rendasVar, ...rendasFix];
      setRendas(stableSortByDateDesc(combinedAfter, (it) => it?.date));
    }
  };

  return (
    <>
      <div className="space-y-4 px-2 sm:px-0">
        {/* Modal de cadastro/edição de renda */}
        {showForm && (
          <Modal
            open={showForm}
            onClose={() => {
              setShowForm(false);
              setEditingId(null);
            }}
            title={editingId ? 'Editar Ganho' : 'Novo Ganho'}
          >
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    placeholder="Ex: Salário, Freelance, Vendas..."
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                  {errors.description && (
                    <p className="text-red-500 text-xs mt-1">{errors.description}</p>
                  )}
                  
                  {/* Sugestões Inteligentes */}
                  {smartSuggestions.suggestions && (
                    <div className="mt-3">
                      <SmartSuggestionsCard
                        suggestions={smartSuggestions.suggestions}
                        isLoading={smartSuggestions.isLoading}
                        isPreselected={true}
                        onAcceptCategory={async () => {
                          const categoryId = await smartSuggestions.acceptCategorySuggestion();
                          if (categoryId) {
                            setForm(f => ({ ...f, categoryId }));
                            // Recarrega categorias para incluir a nova
                            const res = await fetch('/api/categories');
                            if (res.ok) setCategories(await res.json());
                          }
                        }}
                        onAcceptTag={async (tagName) => {
                          const tagId = await smartSuggestions.acceptTagSuggestion(tagName);
                          if (tagId) {
                            setForm(f => ({ ...f, tags: [...f.tags, tagId] }));
                            // Recarrega tags para incluir a nova
                            const res = await fetch('/api/tags');
                            if (res.ok) setTags(await res.json());
                          }
                        }}
                        onDismiss={smartSuggestions.dismissSuggestions}
                      />
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="amount">Valor</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                  {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
                </div>
                <div>
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  />
                  {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
                </div>
                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <select
                    id="category"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.categoryId}
                    onChange={(e) => {
                      if (e.target.value === '__create__') {
                        setShowCategoryModal(true);
                      } else {
                        // Detecta se uma categoria sugerida foi removida (mudou para "" ou outra categoria)
                        if (form.categoryId?.startsWith('suggested:') && e.target.value !== form.categoryId) {
                          const categoryName = form.categoryId.replace('suggested:', '');
                          smartSuggestions.dismissCategorySuggestion(categoryName);
                        }
                        
                        setForm((f) => ({ ...f, categoryId: e.target.value }));
                      }
                    }}
                  >
                    <option value="__create__">➕ Criar categoria</option>
                    <option value="">Sem categoria</option>
                    {/* Sugestão da IA como opção especial */}
                    {smartSuggestions.suggestions?.category?.isNew && (
                      <option value={`suggested:${smartSuggestions.suggestions.category.name}`} className="text-green-600 bg-green-50 font-medium">
                        🤖 {smartSuggestions.suggestions.category.name} (sugestão IA)
                      </option>
                    )}
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
                  <Label htmlFor="paymentType">Tipo de Pagamento</Label>
                  <select
                    id="paymentType"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.paymentType}
                    onChange={(e) => setForm((f) => ({ 
                      ...f, 
                      paymentType: e.target.value,
                      walletId: e.target.value === 'CREDIT' ? '' : f.walletId,
                      creditCardId: e.target.value !== 'CREDIT' ? '' : f.creditCardId
                    }))}
                  >
                    <option value="DEBIT">Débito</option>
                    <option value="CREDIT">Crédito</option>
                    <option value="PIX_TRANSFER">PIX/TRANSF</option>
                    <option value="CASH">Dinheiro</option>
                    <option value="OTHER">Outros</option>
                  </select>
                </div>
                {form.paymentType === 'CREDIT' ? (
                  <div>
                    <Label htmlFor="creditCard">Cartão de Crédito</Label>
                    <select
                      id="creditCard"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={form.creditCardId}
                      onChange={(e) => setForm((f) => ({ ...f, creditCardId: e.target.value }))}
                    >
                      <option value="">Selecione</option>
                      {creditCards.map((cc) => (
                        <option key={cc.id} value={cc.id}>
                          {cc.name}
                        </option>
                      ))}
                    </select>
                    {errors.creditCardId && (
                      <p className="text-red-500 text-xs mt-1">{errors.creditCardId}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="wallet">Carteira</Label>
                  <select
                    id="wallet"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.walletId}
                    onChange={(e) => {
                      if (e.target.value === '__create__') setShowWalletModal(true);
                      else setForm((f) => ({ ...f, walletId: e.target.value }));
                    }}
                  >
                    <option value="__create__">➕ Criar carteira</option>
                    <option value="">Selecione</option>
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                  {errors.walletId && (
                    <p className="text-red-500 text-xs mt-1">{errors.walletId}</p>
                  )}
                  </div>
                )}
                <div>
                  <Label htmlFor="tags">Tags</Label>
                  <MultiTagSelector
                    selectedTags={form.tags}
                    onTagsChange={(newTags) => {
                      // Detecta tags removidas
                      const removedTags = form.tags.filter(tagId => !newTags.includes(tagId));
                      
                      // Dispensa sugestões para tags sugeridas que foram removidas
                      removedTags.forEach(removedTagId => {
                        if (removedTagId.startsWith('suggested:')) {
                          const tagName = removedTagId.replace('suggested:', '');
                          smartSuggestions.dismissTagSuggestion(tagName);
                        }
                      });
                      
                      setForm(f => ({ ...f, tags: newTags }));
                    }}
                    availableTags={tags}
                    suggestedTags={smartSuggestions.suggestions?.tags.map(tag => tag.name) || []}
                    placeholder="Selecione ou crie tags..."
                    maxTags={5}
                    onCreateTag={async (tagName) => {
                      try {
                        const response = await fetch('/api/tags', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name: tagName })
                        });
                        if (response.ok) {
                          const newTag = await response.json();
                          setTags(prev => [...prev, newTag]);
                          return newTag;
                        }
                      } catch (error) {
                        console.error('Erro ao criar tag:', error);
                      }
                      return null;
                    }}
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="isFixed"
                    checked={form.isFixed}
                    onChange={(e) => setForm((f) => ({ ...f, isFixed: e.target.checked }))}
                    className="h-5 w-5 rounded border border-input bg-background text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-150"
                  />
                  <Label htmlFor="isFixed" className="ml-1 select-none cursor-pointer text-sm">
                    Renda Fixa?
                  </Label>
                </div>
                {form.isFixed && (
                  <div>
                    <Label htmlFor="endDate">Data final (opcional)</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-4">
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
                <Button type="submit">{editingId ? 'Salvar' : 'Cadastrar'}</Button>
              </div>
            </form>
          </Modal>
        )}
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Ganhos
            </h1>
            <p className="text-gray-600 dark:text-foreground">
              Gerencie todas as suas rendas (fixas e variáveis) do mês
            </p>
          </div>
          <Button
              onClick={() => {
                setShowForm(true);
                setEditingId(null);
                setForm({
                    description: '',
                    amount: '',
                    date: today,
                    categoryId: '',
                    paymentType: 'DEBIT',
                    walletId: '',
                    creditCardId: '',
                    tags: [],
                    isFixed: false,
                    endDate: '',
                  });
              }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Ganho
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
        {/* Lista de rendas */}
        {isLoading ? (
          <Loader text="Carregando ganhos..." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-muted bg-background">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground">
                  <th className="px-3 py-2 text-left font-semibold">Descrição</th>
                  <th className="px-3 py-2 text-right font-semibold">Valor</th>
                  <th className="px-3 py-2 text-center font-semibold">Data</th>
                  <th className="px-3 py-2 text-center font-semibold">Categoria</th>
                  <th className="px-3 py-2 text-center font-semibold">Tags</th>
                  <th className="px-3 py-2 text-center font-semibold">Pagamento</th>
                  <th className="px-3 py-2 text-center font-semibold">Conta/Cartão</th>
                  <th className="px-3 py-2 text-center font-semibold">Fixa</th>
                  <th className="px-3 py-2 text-center font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRendas.map((renda) => (
                  <tr key={renda.id} className="border-b hover:bg-accent transition-colors">
                    <td className="px-3 py-2 max-w-xs truncate">{renda.description}</td>
                    <td className="px-3 py-2 text-right text-green-600 font-semibold">
                      {formatCurrency(renda.amount)}
                    </td>
                    <td className="px-3 py-2 text-center">{renda.date ? formatDate(renda.date) : '-'}</td>
                    <td className="px-3 py-2 text-center">{renda.categoryName}</td>
                    <td className="px-3 py-2 text-center">
                      {Array.isArray(renda.tags) && renda.tags.length > 0 ? (
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {renda.tags.map((tid) => {
                            const tag = tags.find((t) => String(t.id) === String(tid));
                            return tag ? (
                              <span
                                key={tid}
                                className="inline-block px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                              >
                                {tag.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {renda.paymentType === 'DEBIT' ? 'Débito' :
                       renda.paymentType === 'CREDIT' ? 'Crédito' :
                       renda.paymentType === 'PIX_TRANSFER' ? 'PIX/TRANSF' :
                       renda.paymentType === 'CASH' ? 'Dinheiro' :
                       renda.paymentType === 'OTHER' ? 'Outros' :
                       'Débito'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {renda.paymentType === 'CREDIT' ? (
                        renda.creditCardId
                          ? creditCards.find((cc) => String(cc.id) === String(renda.creditCardId))?.name || '(Cartão não encontrado)'
                          : 'Sem cartão'
                      ) : (
                        renda.walletId
                          ? wallets.find((w) => String(w.id) === String(renda.walletId))?.name || '(Carteira não encontrada)'
                          : 'Sem carteira'
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {renda.isFixed ? (
                        <span
                          className="inline-block w-3 h-3 rounded-full bg-primary"
                          title="Fixa"
                        />
                      ) : null}
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
        {filteredRendas.length === 0 && !showForm && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500">Nenhum ganho cadastrado</p>
              <Button
                className="mt-4"
                onClick={() => {
                  setForm({
                    description: '',
                    amount: '',
                    date: '',
                    categoryId: '',
                    paymentType: 'DEBIT',
                    walletId: '',
                    creditCardId: '',
                    tags: [],
                    isFixed: false,
                    endDate: '',
                  });
                  setEditingId(null);
                  setShowForm(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeiro Ganho
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      {/* Modais de criação */}
      <CategoryCreateModal
        open={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onCreated={async (newCategoryId: string) => {
          const res = await fetch('/api/categories', { cache: 'no-store' });
          if (res.ok) {
            const cats = await res.json();
            setCategories(cats);
            if (newCategoryId) {
              setForm((f) => ({ ...f, categoryId: newCategoryId }));
            }
          }
          setShowCategoryModal(false);
        }}
      />
      <WalletCreateModal
        open={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onCreated={async (newWalletId: string) => {
          const res = await fetch('/api/wallets', { cache: 'no-store' });
          if (res.ok) {
            const ws = await res.json();
            setWallets(ws);
            if (newWalletId) {
              setForm((f) => ({ ...f, walletId: newWalletId }));
            }
          }
          setShowWalletModal(false);
        }}
      />
      <TagCreateModal
        open={showTagModal}
        onClose={() => setShowTagModal(false)}
        onCreated={async (newTagId: string) => {
          const res = await fetch('/api/tags', { cache: 'no-store' });
          if (res.ok) {
            const ts = await res.json();
            setTags(ts);
            if (newTagId) {
              setForm((f) => ({ ...f, tags: [newTagId] }));
            }
          }
          setShowTagModal(false);
        }}
      />
    </>
  );
}
