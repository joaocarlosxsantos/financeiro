"use client";
import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import MultiSelect from '@/components/ui/multi-select';

type GoalFormProps = {
  onClose?: () => void;
  onSaved?: () => void;
  initial?: any;
};

export default function GoalForm({ onClose, onSaved, initial }: GoalFormProps) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('RECURRING');
  const [appliesTo, setAppliesTo] = useState('BOTH');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryItems, setCategoryItems] = useState<{ id: string; name: string }[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagItems, setTagItems] = useState<{ id: string; name: string }[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [tagAggregates, setTagAggregates] = useState<string[]>([]);
  const [kind, setKind] = useState('ATTAINMENT');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      setTitle(initial.title ?? '');
      setAmount(initial.amount ? String(initial.amount) : '');
      setType(initial.type ?? 'RECURRING');
      setAppliesTo(initial.appliesTo ?? 'BOTH');
      setCategoryIds(initial.categoryIds ?? (initial.categoryId ? [initial.categoryId] : []));
      setTagFilters(initial.tagFilters ?? (initial.tagName ? [initial.tagName] : []));
      setTagAggregates(initial.tagAggregates ?? []);
      setKind(initial.kind ?? 'ATTAINMENT');
      // Datas
      if (initial.startDate) {
        setStartDate(new Date(initial.startDate).toISOString().split('T')[0]);
      } else {
        setStartDate(new Date().toISOString().split('T')[0]);
      }
      if (initial.endDate) {
        setEndDate(new Date(initial.endDate).toISOString().split('T')[0]);
      } else {
        const oneMonthAhead = new Date();
        oneMonthAhead.setMonth(oneMonthAhead.getMonth() + 1);
        setEndDate(oneMonthAhead.toISOString().split('T')[0]);
      }
    } else {
      setTitle('');
      setAmount('');
      setType('RECURRING');
      setAppliesTo('BOTH');
      setCategoryIds([]);
      setTagFilters([]);
      setTagAggregates([]);
      setKind('ATTAINMENT');
      // Valores padrão para datas: hoje e um mês a frente
      setStartDate(new Date().toISOString().split('T')[0]);
      const oneMonthAhead = new Date();
      oneMonthAhead.setMonth(oneMonthAhead.getMonth() + 1);
      setEndDate(oneMonthAhead.toISOString().split('T')[0]);
    }
  }, [initial]);

  useEffect(() => {
    // fetch categories and tags
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => {
        console.debug('Fetched categories for GoalForm:', data);
        const list = data || [];
        setCategories(list);
        setCategoryItems(list.map((c: any) => ({ id: c.id, name: c.name })));
      })
      .catch((err) => {
        console.error('Error fetching categories for GoalForm', err);
        setCategories([]);
        setCategoryItems([]);
      });

    fetch('/api/tags')
      .then((r) => r.json())
      .then((data) => {
        console.debug('Fetched tags for GoalForm:', data);
        const names = (data || []).map((t: any) => t.name);
        setTags(names);
        setTagItems(names.map((n: string) => ({ id: n, name: n })));
      })
      .catch((err) => {
        console.error('Error fetching tags for GoalForm', err);
        setTags([]);
        setTagItems([]);
      });
  }, []);

  // Expose manual reload helpers for debugging
  const reloadCategories = async () => {
    try {
      const res = await fetch('/api/categories', { cache: 'no-store' });
      const data = await res.json();
      console.debug('Manual reload categories:', data);
      const list = data || [];
      setCategories(list);
      setCategoryItems(list.map((c: any) => ({ id: c.id, name: c.name })));
    } catch (err) {
      console.error('Failed manual reload categories', err);
    }
  };

  const reloadTags = async () => {
    try {
      const res = await fetch('/api/tags', { cache: 'no-store' });
      const data = await res.json();
      console.debug('Manual reload tags:', data);
      const names = (data || []).map((t: any) => t.name);
      setTags(names);
      setTagItems(names.map((n: string) => ({ id: n, name: n })));
    } catch (err) {
      console.error('Failed manual reload tags', err);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const hasCategory = categoryIds && categoryIds.length > 0;
    const hasTag = (tagFilters && tagFilters.length > 0) || (tagAggregates && tagAggregates.length > 0);
    if (!hasCategory && !hasTag) {
      setError('Informe pelo menos uma categoria ou uma tag (filtro/aggregador).');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        title,
        amount,
        type,
        kind,
        appliesTo,
        categoryIds,
        tagFilters,
        tagAggregates,
      };

      // Adicionar datas apenas se for meta com prazo
      if (type === 'TIMED') {
        payload.startDate = startDate;
        payload.endDate = endDate;
      }

      if (initial?.id) {
        const res = await fetch(`/api/goals/${initial.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Erro ao atualizar');
      } else {
        const res = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error || 'Erro ao criar');
        }
      }

      onSaved?.();
      onClose?.();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Erro ao salvar meta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={true} onClose={() => onClose && onClose()}>
      <form onSubmit={handleSubmit} className="w-full max-w-xl p-6">
        <h3 className="text-xl font-bold mb-4">{initial ? 'Editar Meta' : 'Nova Meta'}</h3>
        {error && <div className="text-sm text-red-500 mb-2">{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Título</label>
            <Input placeholder="Título" value={title} onChange={(e: any) => setTitle(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Valor (R$)</label>
            <Input placeholder="Valor (R$)" value={amount} onChange={(e: any) => setAmount(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tipo de meta</label>
            <Select value={kind} onChange={(e: any) => setKind(e.target.value)}>
              <option value="ATTAINMENT">Atingir valor (ex: investir X)</option>
              <option value="LIMIT">Limite (ex: gastar até X)</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Recorrência</label>
            <Select value={type} onChange={(e: any) => setType(e.target.value)}>
              <option value="RECURRING">Recorrente</option>
              <option value="TIMED">Com prazo</option>
            </Select>
          </div>

          {type === 'TIMED' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Data de início</label>
                <Input type="date" value={startDate} onChange={(e: any) => setStartDate(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Data de fim</label>
                <Input type="date" value={endDate} onChange={(e: any) => setEndDate(e.target.value)} />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Aplica-se a</label>
            <Select value={appliesTo} onChange={(e: any) => setAppliesTo(e.target.value)}>
              <option value="BOTH">Ambos</option>
              <option value="INCOMES">Rendas</option>
              <option value="EXPENSES">Gastos</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Categorias</label>
            <MultiSelect items={categoryItems} value={categoryIds} onChange={setCategoryIds} placeholder="Todas as categorias" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tags - Filtro</label>
            <MultiSelect items={tagItems} value={tagFilters} onChange={setTagFilters} placeholder="Nenhuma" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tags - Agregador</label>
            <MultiSelect items={tagItems} value={tagAggregates} onChange={setTagAggregates} placeholder="Nenhuma" />
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center gap-3">
          <div>
            {initial && (
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  if (!confirm('Deseja realmente excluir esta meta?')) return;
                  try {
                    setLoading(true);
                    const res = await fetch(`/api/goals/${initial.id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Erro ao excluir');
                    onSaved?.();
                    onClose?.();
                  } catch (err) {
                    console.error(err);
                    alert('Erro ao excluir meta');
                  } finally { setLoading(false); }
                }}
              >
                Excluir
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" onClick={() => onClose && onClose()} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : initial ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
