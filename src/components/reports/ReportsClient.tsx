'use client';

import { useEffect, useState, useMemo } from 'react';
import { filterRows } from '@/lib/reportFilters';
import { useTheme } from '@/components/providers/theme-provider';
import Papa from 'papaparse';
import ReactSelect from 'react-select';
import { Input } from '../ui/input';
import { stableSortByDateAsc } from '@/lib/sort';
import { Select as UiSelect } from '../ui/select';
import { Button } from '@/components/ui/button';
import { PAYMENT_TYPE_LABELS } from '../ui/payment-type-multi-select';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

type Option = { id: string; name: string };

// Helper function to translate payment types
const getPaymentTypeLabel = (paymentType: string | null | undefined): string => {
  if (!paymentType) return '-';
  return PAYMENT_TYPE_LABELS[paymentType as keyof typeof PAYMENT_TYPE_LABELS] || paymentType;
};

// Additional imports if needed
type Row = {
  id: string;
  date?: string;
  description?: string;
  amount: number;
  kind: 'income' | 'expense';
  categoryName?: string | null;
  categoryId?: string | null;
  walletName?: string | null;
  walletId?: string | null;
  creditCardName?: string | null;
  creditCardId?: string | null;
  paymentType?: string | null;
  tags?: string[];
  isRecurring?: boolean;
};

export default function ReportsClient() {
  const [type, setType] = useState<'both' | 'income' | 'expense'>('both');
  // Pre-select startDate as first day of current month and endDate as today (format YYYY-MM-DD)
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });

  // theme
  const { resolvedTheme } = useTheme();

  // options & selections
  const [tags, setTags] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [wallets, setWallets] = useState<Option[]>([]);
  const [creditCards, setCreditCards] = useState<Option[]>([]);

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(['__ALL__']);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(['__ALL__']);
  const [selectedWalletIds, setSelectedWalletIds] = useState<string[]>(['__ALL__']);
  const [selectedCreditCardIds, setSelectedCreditCardIds] = useState<string[]>(['__ALL__']);

  // data & pagination
  const [data, setData] = useState<Row[]>([]);
  const [fullDataCache, setFullDataCache] = useState<Record<string, Row[]>>({});
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totals, setTotals] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [filterDebug, setFilterDebug] = useState<null | { availableTags: string[]; selectedTags: string[] }>(null);
  
  // Estados de ordenação
  const [sortColumn, setSortColumn] = useState<'date' | 'type' | 'description' | 'category' | 'wallet' | 'card' | 'amount'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // select styles for react-select (theme aware)
  const selectStyles = useMemo(() => {
    const isDark = resolvedTheme === 'dark';
    return {
      control: (provided: any, state: any) => ({
        ...provided,
        background: isDark ? '#0b1220' : '#fff',
        borderRadius: 8,
        borderColor: state.isFocused ? (isDark ? '#334155' : '#60a5fa') : provided.borderColor,
        boxShadow: 'none',
        minHeight: 38,
      }),
      valueContainer: (provided: any) => ({ ...provided, padding: '6px 8px' }),
      multiValue: (provided: any) => ({
        ...provided,
        background: isDark ? '#075985' : '#e0f2fe',
        color: isDark ? '#f1f5f9' : '#0c4a6e',
      }),
      multiValueLabel: (provided: any) => ({ ...provided, color: isDark ? '#f1f5f9' : '#0c4a6e' }),
      option: (provided: any, state: any) => ({
        ...provided,
        padding: '8px 10px',
        backgroundColor: state.isSelected
          ? isDark
            ? '#083344'
            : '#bfdbfe'
          : state.isFocused
          ? isDark
            ? '#06232b'
            : '#eff6ff'
          : 'transparent',
        color: isDark ? '#f3f4f6' : '#0f172a',
        cursor: 'pointer',
      }),
      menu: (provided: any) => ({
        ...provided,
        zIndex: 9999,
        background: isDark ? '#0b1220' : '#ffffff',
        boxShadow: isDark ? '0 6px 18px rgba(2,6,23,0.6)' : '0 6px 18px rgba(15,23,42,0.12)',
        borderRadius: 8,
      }),
      menuList: (provided: any) => ({ ...provided, maxHeight: '320px' }),
      menuPortal: (provided: any) => ({ ...provided, zIndex: 999999 }),
    };
  }, [resolvedTheme]);

  // load option lists on mount
  useEffect(() => {
    (async () => {
      try {
        const [tRes, cRes, wRes, ccRes] = await Promise.all([
          fetch('/api/tags'),
          fetch('/api/categories'),
          fetch('/api/wallets'),
          fetch('/api/credit-cards'),
        ]);
        if (tRes.ok) {
          const tJson = await tRes.json();
          setTags(
            Array.isArray(tJson)
              ? tJson.map((t: any) => ({ id: String(t.id ?? t.name), name: t.name }))
              : [],
          );
        }
        if (cRes.ok) {
          const cJson = await cRes.json();
          setCategories(
            Array.isArray(cJson) ? cJson.map((c: any) => ({ id: String(c.id), name: c.name })) : [],
          );
        }
        if (wRes.ok) {
          const wJson = await wRes.json();
          setWallets(
            Array.isArray(wJson) ? wJson.map((w: any) => ({ id: String(w.id), name: w.name })) : [],
          );
        }
        if (ccRes.ok) {
          const ccJson = await ccRes.json();
          setCreditCards(
            Array.isArray(ccJson) ? ccJson.map((cc: any) => ({ id: String(cc.id), name: cc.name })) : [],
          );
        }
      } catch (err) {
        // silent
      }
    })();
  }, []);

  // fetch data from API with current filters
  async function fetchData(p: number, size?: number) {
    // Se algum filtro está vazio (array vazio), não mostrar nada
    if (
      selectedTagIds.length === 0 ||
      selectedCategoryIds.length === 0 ||
      selectedWalletIds.length === 0 ||
      selectedCreditCardIds.length === 0
    ) {
      setData([]);
      setTotalCount(0);
      setTotals({ incomes: 0, expenses: 0, net: 0 });
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Key representing the base unfiltered dataset for this type and date range
      const baseKey = `${type}|${startDate}|${endDate}`;

      // compute page size to use for pagination
      const pageSizeToUse = typeof size === 'number' ? size : pageSize;

      // If we have a cached full dataset for the baseKey and the user has selected
      // filters (tags/categories/wallets/creditCards), apply local filtering instead of fetching.
      const hasFilters = 
        (selectedTagIds.length > 0 && !selectedTagIds.includes('__ALL__')) || 
        (selectedCategoryIds.length > 0 && !selectedCategoryIds.includes('__ALL__')) || 
        (selectedWalletIds.length > 0 && !selectedWalletIds.includes('__ALL__')) || 
        (selectedCreditCardIds.length > 0 && !selectedCreditCardIds.includes('__ALL__'));
      if (hasFilters && fullDataCache[baseKey]) {
        const allRows = fullDataCache[baseKey];
        // build a tag lookup from loaded tags (id->name and name->name)
        const tagLookup: Record<string, string> = {};
        for (const t of tags) {
          tagLookup[String(t.id)] = t.name;
          tagLookup[String(t.name)] = t.name;
        }
        // Normalize selected tags for local filtering: include both resolved name and original value
        const normalizedSelectedTags = Array.from(
          new Set(
            selectedTagIds.flatMap((st) => {
              const byId = tagLookup[String(st)];
              return byId ? [byId, String(st)] : [String(st)];
            }),
          ),
        );
        // Normalize tags on cached rows using current tagLookup (so ids -> names when possible)
        // For robustness include both the resolved name (if any) and the raw stored value so matching by id or name works
        const normalizedAllRows = allRows.map((r) => ({
          ...r,
          tags: Array.isArray(r.tags)
            ? Array.from(
                new Set(
                  r.tags.flatMap((tv: string) => {
                    const resolved = tagLookup[String(tv)] ?? String(tv);
                    return [resolved, String(tv)];
                  }),
                ),
              )
            : [],
        }));
        const filtered = filterRows(
          normalizedAllRows as any, 
          selectedCategoryIds.includes('__ALL__') ? [] : selectedCategoryIds, 
          selectedWalletIds.includes('__ALL__') ? [] : selectedWalletIds, 
          selectedTagIds.includes('__ALL__') ? [] : normalizedSelectedTags, 
          selectedCreditCardIds.includes('__ALL__') ? [] : selectedCreditCardIds
        );

  // paginate filtered
        const start = (p - 1) * pageSizeToUse;
        const end = start + pageSizeToUse;
        const pageData = filtered.slice(start, end);

        // compute totals from filtered set
        const incomes = filtered.filter((x) => x.kind === 'income').reduce((acc, cur) => acc + Math.abs(cur.amount), 0);
        const expensesSigned = -Math.abs(filtered.filter((x) => x.kind === 'expense').reduce((acc, cur) => acc + Math.abs(cur.amount), 0));
        const net = incomes + expensesSigned;

        setData(pageData);
        setPage(p);
        setTotalCount(filtered.length);
        setTotals({ incomes, expenses: expensesSigned, net });
        // debug: if no filtered results but we had rows in cache, expose available vs selected tags (dev only)
        if (process.env.NODE_ENV !== 'production') {
          if (filtered.length === 0 && Array.isArray(allRows) && allRows.length > 0) {
            const availableTags = Array.from(
              new Set(
                normalizedAllRows.flatMap((r) => (Array.isArray(r.tags) ? r.tags.map((t: string) => String(t).toLowerCase().trim()) : [])),
              ),
            );
            const selectedTagsLower = normalizedSelectedTags.map((s) => String(s).toLowerCase().trim());
            // lightweight console.debug to help diagnose mismatches during development
            // eslint-disable-next-line no-console
            console.debug('[ReportsClient] local filter returned 0 rows', { availableTags, selectedTags: selectedTagsLower });
            setFilterDebug({ availableTags, selectedTags: selectedTagsLower });
          } else {
            setFilterDebug(null);
          }
        }
        setLoading(false);
        return;
      }
      const params = new URLSearchParams();
      params.set('type', type);
      params.set('startDate', startDate);
      params.set('endDate', endDate);
      if (selectedTagIds.length && !selectedTagIds.includes('__ALL__')) params.set('tags', selectedTagIds.join(','));
      if (selectedCategoryIds.length && !selectedCategoryIds.includes('__ALL__')) params.set('categoryIds', selectedCategoryIds.join(','));
      if (selectedWalletIds.length && !selectedWalletIds.includes('__ALL__')) params.set('walletIds', selectedWalletIds.join(','));
      if (selectedCreditCardIds.length && !selectedCreditCardIds.includes('__ALL__')) params.set('creditCardIds', selectedCreditCardIds.join(','));
      params.set('page', String(p));
  params.set('pageSize', String(pageSizeToUse));

      // keep local state in sync when caller provided an explicit size
      if (typeof size === 'number') {
        setPageSize(size);
      }

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (!res.ok) throw new Error('Erro ao buscar relatórios');
      const json = await res.json();
      const pageData = Array.isArray(json.data) ? json.data.slice() : [];
      const pageDataSorted = stableSortByDateAsc(pageData as any[], (it: any) => it?.date);
      const tagLookup: Record<string, string> = {};
      for (const t of tags) {
        tagLookup[String(t.id)] = t.name;
        tagLookup[String(t.name)] = t.name;
      }
      const rows: Row[] = pageData.map((it: any) => {
        const rawAmount = typeof it.amount === 'number' ? Number(it.amount) : Number(it.amount ?? 0);
        const signedAmount = it.kind === 'expense' ? -Math.abs(rawAmount) : Math.abs(rawAmount);
        return {
          id: it.occurrenceId ?? it.id,
          description: it.description ?? '',
          amount: signedAmount,
          date: it.date ? new Date(it.date).toISOString() : '',
          kind: it.kind,
          categoryName: it.category?.name ?? it.categoryName ?? null,
          categoryId: it.category?.id ?? it.categoryId ?? null,
          walletName: it.wallet?.name ?? it.walletName ?? null,
          walletId: it.wallet?.id ?? it.walletId ?? null,
          creditCardName: it.creditCard?.name ?? it.creditCardName ?? null,
          creditCardId: it.creditCard?.id ?? it.creditCardId ?? null,
          paymentType: it.paymentType ?? null,
          tags: Array.isArray(it.tags) ? it.tags.map((tv: string) => tagLookup[String(tv)] ?? String(tv)) : [],
          isRecurring: Boolean(it.isRecurring),
        };
      });
      setData(rows);
      setPage(json.page || p);
      setTotalCount(json.totalCount || 0);
      // server returns totals.incomes and totals.expenses as positive sums
      // convert expenses to a signed negative value for display consistency
      // and recalculate net as incomes + expensesSigned
      if (json.totals) {
        const incomes = Number(json.totals.incomes ?? 0);
        const expensesSigned = -Math.abs(Number(json.totals.expenses ?? 0));
        const net = incomes + expensesSigned;
        setTotals({ incomes, expenses: expensesSigned, net });
      } else {
        setTotals(null);
      }

      // cache full dataset when server returned full page matching totalCount (we fetched all rows)
      // We'll cache only when no filters were applied in the request (so base unfiltered data is stored)
      const requestHadFilters = 
        (selectedTagIds.length > 0 && !selectedTagIds.includes('__ALL__')) || 
        (selectedCategoryIds.length > 0 && !selectedCategoryIds.includes('__ALL__')) || 
        (selectedWalletIds.length > 0 && !selectedWalletIds.includes('__ALL__')) || 
        (selectedCreditCardIds.length > 0 && !selectedCreditCardIds.includes('__ALL__'));
      if (!requestHadFilters && (Array.isArray(json.data) && (json.data.length === (json.totalCount || 0) || (json.totalCount || 0) <= pageSizeToUse))) {
        const key = `${type}|${startDate}|${endDate}`;
        setFullDataCache((prev) => ({ ...prev, [key]: rows }));
      }
    } catch (err) {
      // erro silencioso ao buscar dados (evita poluir console na carga inicial)
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    if (!data || data.length === 0) return;
    (async () => {
      const params = new URLSearchParams();
      params.set('type', type);
      params.set('startDate', startDate);
      params.set('endDate', endDate);
      if (selectedTagIds.length && !selectedTagIds.includes('__ALL__')) params.set('tags', selectedTagIds.join(','));
      if (selectedCategoryIds.length && !selectedCategoryIds.includes('__ALL__')) params.set('categoryIds', selectedCategoryIds.join(','));
      if (selectedWalletIds.length && !selectedWalletIds.includes('__ALL__')) params.set('walletIds', selectedWalletIds.join(','));
      if (selectedCreditCardIds.length && !selectedCreditCardIds.includes('__ALL__')) params.set('creditCardIds', selectedCreditCardIds.join(','));
      params.set('page', '1');
      const requestSize = totalCount > 0 ? totalCount : 100000;
      params.set('pageSize', String(requestSize));
      try {
        const res = await fetch(`/api/reports?${params.toString()}`);
        if (!res.ok) throw new Error('Erro ao carregar dados para exportação');
        const json = await res.json();
  let allData = Array.isArray(json.data) ? json.data.slice() : [];
  // Stable sort by date asc for export
  allData = stableSortByDateAsc(allData as any[], (it: any) => it?.date);
        const tagLookup: Record<string, string> = {};
        for (const t of tags) {
          tagLookup[String(t.id)] = t.name;
          tagLookup[String(t.name)] = t.name;
        }
        const csvRows = allData.map((it: any) => {
          const rawAmount = typeof it.amount === 'number' ? Number(it.amount) : Number(it.amount ?? 0);
          const signedAmount = it.kind === 'expense' ? -Math.abs(rawAmount) : Math.abs(rawAmount);
          return {
            Data: it.date ? new Date(it.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '',
            Tipo: it.kind === 'income' ? 'Ganho' : 'Gasto',
            Descrição: it.description ?? '',
            Categoria: it.category?.name ?? it.categoryName ?? '',
            Carteira: it.wallet?.name ?? it.walletName ?? '',
            Cartão: it.creditCard?.name ?? it.creditCardName ?? '',
            'Tipo Pgto': getPaymentTypeLabel(it.paymentType),
            Tags: Array.isArray(it.tags) ? it.tags.map((tv: string) => tagLookup[String(tv)] ?? String(tv)).join(', ') : '',
            Recorrente: Boolean(it.isRecurring) ? 'Sim' : 'Não',
            Valor: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(signedAmount)),
          };
        });
        const csv = Papa.unparse(csvRows, { header: true });
        const csvWithBOM = '\uFEFF' + csv;
        const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        // silent
      }
    })();
  }

  async function exportXLSX() {
    try {
      const params = new URLSearchParams();
      params.set('type', type);
      params.set('startDate', startDate);
      params.set('endDate', endDate);
      if (selectedTagIds.length && !selectedTagIds.includes('__ALL__')) params.set('tags', selectedTagIds.join(','));
      if (selectedCategoryIds.length && !selectedCategoryIds.includes('__ALL__')) params.set('categoryIds', selectedCategoryIds.join(','));
      if (selectedWalletIds.length && !selectedWalletIds.includes('__ALL__')) params.set('walletIds', selectedWalletIds.join(','));
      if (selectedCreditCardIds.length && !selectedCreditCardIds.includes('__ALL__')) params.set('creditCardIds', selectedCreditCardIds.join(','));
      const res = await fetch(`/api/reports/export?${params.toString()}`);
      if (!res.ok) throw new Error('Erro ao gerar planilha');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorios-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      // silencioso: falha no download de XLSX será observada pelo UX/usuário
    }
  }

  // Fetch when filters change (type, dates, selected filters, pageSize handled elsewhere)
  useEffect(() => {
    // always fetch first page when filters change
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, startDate, endDate, selectedTagIds, selectedCategoryIds, selectedWalletIds, selectedCreditCardIds]);

  return (
    <div className="flex flex-col h-full overflow-hidden space-y-4">
      <div className="flex-none space-y-4">
      <form
        className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end"
        aria-labelledby="reports-filters"
      >

        <div className="lg:col-span-1 sm:col-span-2 col-span-2">
          <label htmlFor="tipo" className="block text-sm font-medium">
            Tipo
          </label>
          <UiSelect
            id="tipo"
            aria-label="Tipo de transação"
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="mt-1"
          >
            <option value="both">Ambos</option>
            <option value="income">Ganhos</option>
            <option value="expense">Gastos</option>
          </UiSelect>
        </div>

        <div className="lg:col-span-1 sm:col-span-2 col-span-1">
          <label htmlFor="startDate" className="block text-sm font-medium">
            Início
          </label>
          <Input
            id="startDate"
            aria-label="Data início"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 w-full"
          />
        </div>

        <div className="lg:col-span-1 sm:col-span-2 col-span-1">
          <label htmlFor="endDate" className="block text-sm font-medium">
            Fim
          </label>
          <Input
            id="endDate"
            aria-label="Data fim"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 w-full"
          />
        </div>

        <div className="lg:col-span-1 sm:col-span-2 col-span-2">
          <label className="block text-sm font-medium">Carteiras</label>
          <div className="mt-1">
            <ReactSelect
              aria-label="Carteiras"
              isMulti
              options={[{ value: '__ALL__', label: 'Todas' }, ...wallets.map((w) => ({ value: w.id, label: w.name }))]}
              value={selectedWalletIds.includes('__ALL__') 
                ? [{ value: '__ALL__', label: 'Todas' }]
                : wallets
                    .filter((w) => selectedWalletIds.includes(w.id))
                    .map((w) => ({ value: w.id, label: w.name }))
              }
              onChange={(vals: any) => {
                const values = (vals || []).map((v: any) => v.value);
                
                // Se nada foi selecionado, não selecionar nada (mostra lista vazia)
                if (values.length === 0) {
                  setSelectedWalletIds([]);
                  return;
                }
                
                // Se o usuário selecionou '__ALL__' junto com outros itens
                if (values.includes('__ALL__') && values.length > 1) {
                  // Detectar qual item foi adicionado
                  const addedItem = values.find((v: string) => !selectedWalletIds.includes(v));
                  
                  if (addedItem === '__ALL__') {
                    // Clicou em "Todas", selecionar apenas "Todas"
                    setSelectedWalletIds(['__ALL__']);
                  } else {
                    // Clicou em outro item tendo "Todas" selecionado, manter apenas o novo
                    setSelectedWalletIds([addedItem]);
                  }
                  return;
                }
                
                // Se apenas '__ALL__' está selecionado, manter assim
                if (values.includes('__ALL__') && values.length === 1) {
                  setSelectedWalletIds(['__ALL__']);
                  return;
                }
                
                // Se o usuário selecionou todas as opções manualmente, trocar para '__ALL__'
                if (values.length === wallets.length && !values.includes('__ALL__')) {
                  setSelectedWalletIds(['__ALL__']);
                  return;
                }
                
                // Caso contrário, usar os valores selecionados
                setSelectedWalletIds(values);
              }}
              styles={selectStyles}
              menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
              menuPosition={'fixed'}
              menuPlacement={'auto'}
              className="w-full"
            />
          </div>
        </div>

        <div className="lg:col-span-1 sm:col-span-2 col-span-2">
          <label className="block text-sm font-medium">Cartões de Crédito</label>
          <div className="mt-1">
            <ReactSelect
              aria-label="Cartões de Crédito"
              isMulti
              options={[
                { value: '__ALL__', label: 'Todos' },
                { value: '__NONE__', label: 'Nenhum' },
                ...creditCards.map((c) => ({ value: c.id, label: c.name }))
              ]}
              value={
                selectedCreditCardIds.includes('__ALL__') 
                  ? [{ value: '__ALL__', label: 'Todos' }]
                  : selectedCreditCardIds.includes('__NONE__')
                  ? [{ value: '__NONE__', label: 'Nenhum' }]
                  : creditCards
                      .filter((c) => selectedCreditCardIds.includes(c.id))
                      .map((c) => ({ value: c.id, label: c.name }))
              }
              onChange={(vals: any) => {
                const values = (vals || []).map((v: any) => v.value);
                
                // Se nada foi selecionado, não selecionar nada (mostra lista vazia)
                if (values.length === 0) {
                  setSelectedCreditCardIds([]);
                  return;
                }
                
                // Se selecionou '__ALL__' ou '__NONE__' junto com outros
                if ((values.includes('__ALL__') || values.includes('__NONE__')) && values.length > 1) {
                  // Detectar qual item foi adicionado
                  const addedItem = values.find((v: string) => !selectedCreditCardIds.includes(v));
                  
                  if (addedItem === '__ALL__' || addedItem === '__NONE__') {
                    // Clicou em "Todos" ou "Nenhum", selecionar apenas ele
                    setSelectedCreditCardIds([addedItem]);
                  } else {
                    // Clicou em outro item tendo especial selecionado, manter apenas o novo
                    setSelectedCreditCardIds([addedItem]);
                  }
                  return;
                }
                
                // Se apenas '__ALL__' ou '__NONE__' está selecionado, manter assim
                if (values.length === 1 && (values[0] === '__ALL__' || values[0] === '__NONE__')) {
                  setSelectedCreditCardIds(values);
                  return;
                }
                
                // Se o usuário selecionou todos os cartões manualmente, trocar para '__ALL__'
                if (values.length === creditCards.length && !values.includes('__ALL__') && !values.includes('__NONE__')) {
                  setSelectedCreditCardIds(['__ALL__']);
                  return;
                }
                
                // Caso contrário, usar os valores selecionados (IDs específicos)
                setSelectedCreditCardIds(values);
              }}
              styles={selectStyles}
              menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
              menuPosition={'fixed'}
              menuPlacement={'auto'}
              className="w-full"
            />
          </div>
        </div>

        <div className="lg:col-span-1 sm:col-span-2 col-span-2">
          <label className="block text-sm font-medium">Categorias</label>
          <div className="mt-1">
            <ReactSelect
              aria-label="Categorias"
              isMulti
              options={[{ value: '__ALL__', label: 'Todas' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
              value={selectedCategoryIds.includes('__ALL__') 
                ? [{ value: '__ALL__', label: 'Todas' }]
                : categories
                    .filter((c) => selectedCategoryIds.includes(c.id))
                    .map((c) => ({ value: c.id, label: c.name }))
              }
              onChange={(vals: any) => {
                const values = (vals || []).map((v: any) => v.value);
                
                // Se nada foi selecionado, não selecionar nada (mostra lista vazia)
                if (values.length === 0) {
                  setSelectedCategoryIds([]);
                  return;
                }
                
                // Se o usuário selecionou '__ALL__' junto com outros itens
                if (values.includes('__ALL__') && values.length > 1) {
                  // Detectar qual item foi adicionado
                  const addedItem = values.find((v: string) => !selectedCategoryIds.includes(v));
                  
                  if (addedItem === '__ALL__') {
                    // Clicou em "Todas", selecionar apenas "Todas"
                    setSelectedCategoryIds(['__ALL__']);
                  } else {
                    // Clicou em outro item tendo "Todas" selecionado, manter apenas o novo
                    setSelectedCategoryIds([addedItem]);
                  }
                  return;
                }
                
                // Se apenas '__ALL__' está selecionado, manter assim
                if (values.includes('__ALL__') && values.length === 1) {
                  setSelectedCategoryIds(['__ALL__']);
                  return;
                }
                
                // Se o usuário selecionou todas as categorias manualmente, trocar para '__ALL__'
                if (values.length === categories.length && !values.includes('__ALL__')) {
                  setSelectedCategoryIds(['__ALL__']);
                  return;
                }
                
                // Caso contrário, usar os valores selecionados
                setSelectedCategoryIds(values);
              }}
              styles={selectStyles}
              menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
              menuPosition={'fixed'}
              menuPlacement={'auto'}
              className="w-full"
            />
          </div>
        </div>

        <div className="lg:col-span-1 sm:col-span-2 col-span-2">
          <label className="block text-sm font-medium">Tags</label>
          <div className="mt-1">
            <ReactSelect
              aria-label="Tags"
              isMulti
              options={[
                { value: '__ALL__', label: 'Todas' },
                { value: '__NONE__', label: 'Nenhuma' },
                ...tags.map((t) => ({ value: t.id, label: t.name }))
              ]}
              value={
                selectedTagIds.includes('__ALL__') 
                  ? [{ value: '__ALL__', label: 'Todas' }]
                  : selectedTagIds.includes('__NONE__')
                  ? [{ value: '__NONE__', label: 'Nenhuma' }]
                  : tags
                      .filter((t) => selectedTagIds.includes(t.id))
                      .map((t) => ({ value: t.id, label: t.name }))
              }
              onChange={(vals: any) => {
                const values = (vals || []).map((v: any) => v.value);
                
                // Se nada foi selecionado, não selecionar nada (mostra lista vazia)
                if (values.length === 0) {
                  setSelectedTagIds([]);
                  return;
                }
                
                // Se selecionou '__ALL__' ou '__NONE__' junto com outros
                if ((values.includes('__ALL__') || values.includes('__NONE__')) && values.length > 1) {
                  // Detectar qual item foi adicionado
                  const addedItem = values.find((v: string) => !selectedTagIds.includes(v));
                  
                  if (addedItem === '__ALL__' || addedItem === '__NONE__') {
                    // Clicou em "Todas" ou "Nenhuma", selecionar apenas ele
                    setSelectedTagIds([addedItem]);
                  } else {
                    // Clicou em outro item tendo especial selecionado, manter apenas o novo
                    setSelectedTagIds([addedItem]);
                  }
                  return;
                }
                
                // Se apenas '__ALL__' ou '__NONE__' está selecionado, manter assim
                if (values.length === 1 && (values[0] === '__ALL__' || values[0] === '__NONE__')) {
                  setSelectedTagIds(values);
                  return;
                }
                
                // Se o usuário selecionou todas as tags manualmente, trocar para '__ALL__'
                if (values.length === tags.length && !values.includes('__ALL__') && !values.includes('__NONE__')) {
                  setSelectedTagIds(['__ALL__']);
                  return;
                }
                
                // Caso contrário, usar os valores selecionados (IDs específicos)
                setSelectedTagIds(values);
              }}
              styles={selectStyles}
              menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
              menuPosition={'fixed'}
              menuPlacement={'auto'}
              classNamePrefix="react-select"
              className="w-full"
            />
          </div>
        </div>

      </form>

      <div className="grid grid-cols-1 gap-3 items-stretch w-full">
        <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-md shadow-sm w-full">
          <div
            aria-live="polite"
            className="mt-1 font-semibold text-slate-900 dark:text-slate-100 w-full"
          >
            {totals ? (
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch sm:items-center text-sm w-full justify-between">
                <div className="flex-1 flex flex-col items-center justify-center">
                    <span className="block text-xs text-slate-500">Ganhos</span>
                    <span className="text-lg font-semibold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                            Number(totals.incomes),
                        )}
                    </span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center">
                    <span className="block text-xs text-slate-500">Despesas</span>
                    <span className="text-lg font-semibold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                            Number(totals.expenses),
                        )}
                    </span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center">
                    <span className="block text-xs text-slate-500">Saldo</span>
                    <span className="text-xl font-bold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                            Number(totals.net),
                        )}
                    </span>
                </div>
            </div>
            ) : (
              '—'
            )}
          </div>
        </div>
      </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch flex-none">
        <div className="flex items-center gap-2">
          <Button
            aria-label="Página anterior"
            variant="outline"
            size="sm"
            onClick={() => {
              if (page > 1) {
                setPage(page - 1);
                fetchData(page - 1);
              }
            }}
            disabled={page <= 1}
          >
            Anterior
          </Button>
          <span className="text-sm">
            {page} / {Math.max(1, Math.ceil(totalCount / pageSize) || 1)}
          </span>
          <Button
            aria-label="Próxima página"
            variant="outline"
            size="sm"
            onClick={() => {
              const maxPage = Math.ceil(totalCount / pageSize) || 1;
              if (page < maxPage) {
                setPage(page + 1);
                fetchData(page + 1);
              }
            }}
            disabled={page >= Math.ceil(totalCount / pageSize)}
          >
            Próximo
          </Button>
          <UiSelect
            aria-label="Linhas por página"
            value={String(pageSize)}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              setPageSize(newSize);
              setPage(1);
              fetchData(1, newSize);
            }}
            className="w-28"
          >
            <option value={'10'}>10</option>
            <option value={'25'}>25</option>
            <option value={'50'}>50</option>
            <option value={'100'}>100</option>
          </UiSelect>
        </div>
        <div className="sm:col-span-2 lg:col-span-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-end">
          {/* Atualizar manual removido: filtros atualizam automaticamente ao alterar */}
          <Button
            aria-label="Exportar CSV"
            type="button"
            variant="outline"
            onClick={exportCSV}
            disabled={totalCount === 0 || loading}
            className="w-full sm:w-auto"
            size="sm"
          >
            Exportar CSV
          </Button>
          <Button
            aria-label="Exportar XLSX"
            type="button"
            variant="outline"
            onClick={exportXLSX}
            disabled={totalCount === 0 || loading}
            className="w-full sm:w-auto"
            size="sm"
          >
            Exportar XLSX
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {loading ? (
          <div role="status" aria-live="polite" className="p-4">
            Carregando...
          </div>
        ) : data.length === 0 ? (
          <div role="status" aria-live="polite" className="p-4">
            Nenhum resultado
            {filterDebug ? (
              <div className="mt-2 text-xs text-slate-500">
                <div>DEBUG: tags disponíveis: {filterDebug.availableTags.join(', ') || '-'}</div>
                <div>DEBUG: tags selecionadas: {filterDebug.selectedTags.join(', ') || '-'}</div>
              </div>
            ) : null}
          </div>
        ) : (
          (() => {
            // Função de ordenação
            const handleSort = (column: typeof sortColumn) => {
              if (sortColumn === column) {
                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
              } else {
                setSortColumn(column);
                setSortDirection('asc');
              }
            };

            // Ícone de ordenação
            const SortIcon = ({ column }: { column: typeof sortColumn }) => {
              if (sortColumn !== column) {
                return <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />;
              }
              return sortDirection === 'asc' ? (
                <ArrowUp className="ml-1 h-4 w-4" />
              ) : (
                <ArrowDown className="ml-1 h-4 w-4" />
              );
            };

            // Ordenar dados
            const sortedData = [...data].sort((a, b) => {
              let comparison = 0;
              
              switch (sortColumn) {
                case 'date':
                  comparison = new Date(a.date || '').getTime() - new Date(b.date || '').getTime();
                  break;
                case 'type':
                  comparison = (a.kind || '').localeCompare(b.kind || '');
                  break;
                case 'description':
                  comparison = (a.description || '').localeCompare(b.description || '');
                  break;
                case 'category':
                  comparison = (a.categoryName || '').localeCompare(b.categoryName || '');
                  break;
                case 'wallet':
                  comparison = (a.walletName || '').localeCompare(b.walletName || '');
                  break;
                case 'card':
                  comparison = (a.creditCardName || '').localeCompare(b.creditCardName || '');
                  break;
                case 'amount':
                  comparison = (a.amount || 0) - (b.amount || 0);
                  break;
              }
              
              return sortDirection === 'asc' ? comparison : -comparison;
            });

            return (
          <div className="flex-1 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <th 
                    className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors select-none"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center">
                      Data
                      <SortIcon column="date" />
                    </div>
                  </th>
                  <th 
                    className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors select-none"
                    onClick={() => handleSort('type')}
                  >
                    <div className="flex items-center">
                      Tipo
                      <SortIcon column="type" />
                    </div>
                  </th>
                  <th 
                    className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors select-none"
                    onClick={() => handleSort('description')}
                  >
                    <div className="flex items-center">
                      Descrição
                      <SortIcon column="description" />
                    </div>
                  </th>
                  <th 
                    className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors select-none"
                    onClick={() => handleSort('category')}
                  >
                    <div className="flex items-center">
                      Categoria
                      <SortIcon column="category" />
                    </div>
                  </th>
                  <th 
                    className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors select-none"
                    onClick={() => handleSort('wallet')}
                  >
                    <div className="flex items-center">
                      Carteira
                      <SortIcon column="wallet" />
                    </div>
                  </th>
                  <th 
                    className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors select-none"
                    onClick={() => handleSort('card')}
                  >
                    <div className="flex items-center">
                      Cartão
                      <SortIcon column="card" />
                    </div>
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-gray-100">Tipo Pgto</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-gray-100">Tags</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-900 dark:text-gray-100">Recorrente</th>
                  <th 
                    className="text-right py-4 px-4 font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors select-none"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center justify-end">
                      Valor
                      <SortIcon column="amount" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-100 font-medium">
                      {d.date ? new Date(d.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : ''}
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{d.kind === 'income' ? 'Ganhos' : 'Gastos'}</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{d.description}</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{d.categoryName ?? '-'}</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{d.walletName ?? '-'}</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{d.creditCardName ?? '-'}</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{getPaymentTypeLabel(d.paymentType)}</td>
                    <td className="py-3 px-4">
                      {Array.isArray(d.tags) && d.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {d.tags.map((t: string, i: number) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-700 dark:text-sky-100"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {d.isRecurring ? (
                        <div className="flex items-center justify-center">
                          <span className="inline-block w-3 h-3 bg-blue-600 dark:bg-blue-400 rounded-full"></span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100 font-medium">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(Number(d.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            );
          })()
        )}
      </div>
      </div>
    </div>
  );
}
