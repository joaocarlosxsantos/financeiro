'use client';

import { useEffect, useState, useMemo } from 'react';
import { filterRows } from '@/lib/reportFilters';
import { useTheme } from '@/components/providers/theme-provider';
import Papa from 'papaparse';
import ReactSelect from 'react-select';
import { Input } from '../ui/input';
import { Select as UiSelect } from '../ui/select';
import { Button } from '@/components/ui/button';

type Option = { id: string; name: string };

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
  tags?: string[];
  isFixed?: boolean;
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

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedWalletIds, setSelectedWalletIds] = useState<string[]>([]);

  // data & pagination
  const [data, setData] = useState<Row[]>([]);
  const [fullDataCache, setFullDataCache] = useState<Record<string, Row[]>>({});
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totals, setTotals] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [filterDebug, setFilterDebug] = useState<null | { availableTags: string[]; selectedTags: string[] }>(null);

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
        const [tRes, cRes, wRes] = await Promise.all([
          fetch('/api/tags'),
          fetch('/api/categories'),
          fetch('/api/wallets'),
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
      } catch (err) {
        // silent
      }
    })();
  }, []);

  // fetch data from API with current filters
  async function fetchData(p: number, size?: number) {
    setLoading(true);
    try {
      // Key representing the base unfiltered dataset for this type and date range
      const baseKey = `${type}|${startDate}|${endDate}`;

      // compute page size to use for pagination
      const pageSizeToUse = typeof size === 'number' ? size : pageSize;

      // If we have a cached full dataset for the baseKey and the user has selected
      // filters (tags/categories/wallets), apply local filtering instead of fetching.
      const hasFilters = selectedTagIds.length > 0 || selectedCategoryIds.length > 0 || selectedWalletIds.length > 0;
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
        const filtered = filterRows(normalizedAllRows as any, selectedCategoryIds, selectedWalletIds, normalizedSelectedTags);

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
      if (selectedTagIds.length) params.set('tags', selectedTagIds.join(','));
      if (selectedCategoryIds.length) params.set('categoryIds', selectedCategoryIds.join(','));
      if (selectedWalletIds.length) params.set('walletIds', selectedWalletIds.join(','));
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
      pageData.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
          tags: Array.isArray(it.tags) ? it.tags.map((tv: string) => tagLookup[String(tv)] ?? String(tv)) : [],
          isFixed: Boolean(it.isFixed),
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
      const requestHadFilters = selectedTagIds.length > 0 || selectedCategoryIds.length > 0 || selectedWalletIds.length > 0;
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
      if (selectedTagIds.length) params.set('tags', selectedTagIds.join(','));
      if (selectedCategoryIds.length) params.set('categoryIds', selectedCategoryIds.join(','));
      if (selectedWalletIds.length) params.set('walletIds', selectedWalletIds.join(','));
      params.set('page', '1');
      const requestSize = totalCount > 0 ? totalCount : 100000;
      params.set('pageSize', String(requestSize));
      try {
        const res = await fetch(`/api/reports?${params.toString()}`);
        if (!res.ok) throw new Error('Erro ao carregar dados para exportação');
        const json = await res.json();
  let allData = Array.isArray(json.data) ? json.data.slice() : [];
  allData.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
            Tags: Array.isArray(it.tags) ? it.tags.map((tv: string) => tagLookup[String(tv)] ?? String(tv)).join(', ') : '',
            Fixa: Boolean(it.isFixed) ? 'Sim' : 'Não',
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
      if (selectedTagIds.length) params.set('tags', selectedTagIds.join(','));
      if (selectedCategoryIds.length) params.set('categoryIds', selectedCategoryIds.join(','));
      if (selectedWalletIds.length) params.set('walletIds', selectedWalletIds.join(','));
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
  }, [type, startDate, endDate, selectedTagIds, selectedCategoryIds, selectedWalletIds]);

  return (
    <div className="space-y-4">
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
              options={wallets.map((w) => ({ value: w.id, label: w.name }))}
              value={wallets
                .filter((w) => selectedWalletIds.includes(w.id))
                .map((w) => ({ value: w.id, label: w.name }))}
              onChange={(vals: any) => setSelectedWalletIds((vals || []).map((v: any) => v.value))}
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
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              value={categories
                .filter((c) => selectedCategoryIds.includes(c.id))
                .map((c) => ({ value: c.id, label: c.name }))}
              onChange={(vals: any) =>
                setSelectedCategoryIds((vals || []).map((v: any) => v.value))
              }
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
              options={tags.map((t) => ({ value: t.id, label: t.name }))}
              value={tags
                .filter((t) => selectedTagIds.includes(t.id))
                .map((t) => ({ value: t.id, label: t.name }))}
              onChange={(vals: any) => setSelectedTagIds((vals || []).map((v: any) => v.value))}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
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

      <div>
        {loading ? (
          <div role="status" aria-live="polite">
            Carregando...
          </div>
        ) : data.length === 0 ? (
          <div role="status" aria-live="polite">
            Nenhum resultado
            {filterDebug ? (
              <div className="mt-2 text-xs text-slate-500">
                <div>DEBUG: tags disponíveis: {filterDebug.availableTags.join(', ') || '-'}</div>
                <div>DEBUG: tags selecionadas: {filterDebug.selectedTags.join(', ') || '-'}</div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="overflow-auto border rounded">
            <table className="w-full text-left" role="table" aria-label="Tabela de resultados">
              <caption className="sr-only">
                Resultados do filtro de relatórios (data, tipo, categoria, carteira)
              </caption>
              <thead>
                <tr>
                  <th className="p-2">Data</th>
                  <th className="p-2">Tipo</th>
                  <th className="p-2">Descrição</th>
                  <th className="p-2">Categoria</th>
                  <th className="p-2">Carteira</th>
                  <th className="p-2">Tags</th>
                  <th className="p-2">Fixa</th>
                  <th className="p-2">Valor</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr
                    key={d.id}
                    className="border-t focus:outline-none focus:ring-2 focus:ring-primary/60"
                    tabIndex={0}
                    role="row"
                    aria-label={`${d.date} ${d.kind} ${d.description}`}
                  >
                    <td className="p-2">
                      {d.date ? new Date(d.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : ''}
                    </td>
                    <td className="p-2">{d.kind === 'income' ? 'Ganhos' : 'Gastos'}</td>
                    <td className="p-2">{d.description}</td>
                    <td className="p-2">{d.categoryName ?? '-'}</td>
                    <td className="p-2">{d.walletName ?? '-'}</td>
                    <td className="p-2">
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
                        '-'
                      )}
                    </td>
                    <td className="p-2">{d.isFixed ? 'Sim' : 'Não'}</td>
                    <td className="p-2">
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
        )}
      </div>
    </div>
  );
}
