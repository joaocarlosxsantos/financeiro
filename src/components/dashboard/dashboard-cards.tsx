'use client';

import { useState } from 'react';

/**
 * Dashboard Summary Cards Component
 * 
 * Exibe os 5 cards resumo principais do dashboard:
 * - Ganhos Totais
 * - Gastos Totais
 * - Saldo do Mês
 * - Limite Diário
 * - Saldo Acumulado
 * 
 * Também inclui:
 * - Quick Add FAB (Floating Action Button)
 * - Quick Add Modal com 3 tabs (despesa, renda, transferência)
 * - Modal detalhado de ganhos/gastos por categoria
 * 
 * @component
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AutoFitNumber } from '@/components/ui/auto-fit-number';
import { Modal } from '@/components/ui/modal';
import { Fab } from '@/components/ui/fab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import WalletMultiSelect from '@/components/ui/wallet-multi-select';
import QuickDespesaForm from '../quick-add/quick-despesa-form';
import QuickRendaForm from '../quick-add/quick-renda-form';
import QuickCardForm from '../quick-add/quick-card-form';
import QuickTransferForm from '../quick-add/quick-transfer-form';
import type { Summary } from '@/hooks/use-dashboard-state';
import { SmartInsightsWidget, SmartInsight } from './smart-insights-widget';

interface DashboardCardsProps {
  // Card data
  totalIncome: number;
  totalExpenses: number;
  saldoDoMes: number;
  saldoAcumulado: number;
  limiteDiario: number;

  // Summary data
  summary: Summary;

  // Date info
  monthYearLabel: string;
  isAtCurrentMonth: boolean;
  currentDate: Date;

  // Date navigation
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onDateChange: (date: Date) => void;

  // Wallet filter
  wallets: Array<{ id: string; name: string; type: string }>;
  selectedWallet: string[];
  setSelectedWallet: (v: string[]) => void;

  // Wallet filter
  wallets: Array<{ id: string; name: string; type: string }>;
  selectedWallet: string[];
  setSelectedWallet: (v: string[]) => void;

  // Modal states
  modal: null | 'income' | 'expense' | 'balance' | 'diff';
  setModal: (v: null | 'income' | 'expense' | 'balance' | 'diff') => void;

  quickAddOpen: boolean;
  setQuickAddOpen: (v: boolean) => void;
  quickTab: 'despesa' | 'renda' | 'cartao' | 'transferencia';
  setQuickTab: (v: 'despesa' | 'renda' | 'cartao' | 'transferencia') => void;

  // Smart insights
  smartInsights?: SmartInsight[];

  // Tour
  onTourClick?: () => void;

  // Callbacks
  onQuickAddSuccess: () => void;
}

/**
 * 5 Cards Summary Component
 * Displays income, expenses, balance, daily limit, and accumulated balance
 */
function SummaryCards({
  totalIncome,
  totalExpenses,
  saldoDoMes,
  saldoAcumulado,
  limiteDiario,
  onCardClick,
}: {
  totalIncome: number;
  totalExpenses: number;
  saldoDoMes: number;
  saldoAcumulado: number;
  limiteDiario: number;
  onCardClick: (type: 'income' | 'expense' | 'balance') => void;
}): JSX.Element {
  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4 w-full">
      {/* Ganhos Totais */}
      <Card
        onClick={() => onCardClick('income')}
        className="group relative order-1 cursor-pointer flex flex-col h-full min-h-[150px] overflow-hidden"
        aria-label="Ganhos Totais"
        data-tour="card-income"
      >
        <CardContent className="p-2 flex flex-col flex-1">
          <div className="flex flex-1 items-center justify-between gap-2">
            <AutoFitNumber
              value={formatCurrency(totalIncome)}
              className="text-green-600"
              max={40}
              min={16}
            />
            <TrendingUp className="hidden 2xl:block h-7 w-7 text-green-500/80" />
          </div>
          <div className="mt-1 text-center text-xs sm:text-sm font-semibold text-foreground">
            Ganhos Totais
          </div>
          <span className="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 hidden group-hover:block w-max max-w-[180px] px-2 py-1 rounded bg-slate-900 text-white text-[10px] shadow z-10">
            Soma dos ganhos do mês selecionado
          </span>
        </CardContent>
      </Card>

      {/* Gastos Totais */}
      <Card
        onClick={() => onCardClick('expense')}
        className="group relative order-2 cursor-pointer flex flex-col h-full min-h-[150px] overflow-hidden"
        aria-label="Gastos Totais"
        data-tour="card-expense"
      >
        <CardContent className="p-2 flex flex-col flex-1">
          <div className="flex flex-1 items-center justify-between gap-2">
            <AutoFitNumber
              value={formatCurrency(totalExpenses)}
              className="text-red-600"
              max={40}
              min={16}
            />
            <TrendingDown className="hidden 2xl:block h-7 w-7 text-red-500/80" />
          </div>
          <div className="mt-1 text-center text-xs sm:text-sm font-semibold text-foreground">
            Gastos Totais
          </div>
          <span className="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 hidden group-hover:block w-max max-w-[180px] px-2 py-1 rounded bg-slate-900 text-white text-[10px] shadow z-10">
            Soma dos gastos do mês selecionado
          </span>
        </CardContent>
      </Card>

      {/* Saldo do mês */}
      <Card
        onClick={() => onCardClick('balance')}
        className="group relative order-3 cursor-pointer flex flex-col h-full min-h-[150px] overflow-hidden"
        aria-label="Saldo do mês"
        data-tour="cards-totals"
      >
        <CardContent className="p-2 flex flex-col flex-1">
          <div className="flex flex-1 items-center justify-between gap-2">
            <AutoFitNumber
              value={formatCurrency(saldoDoMes)}
              className="text-blue-600"
              max={42}
              min={18}
            />
            <DollarSign className="hidden 2xl:block h-7 w-7 text-blue-500/80" />
          </div>
          <div className="mt-1 text-center text-xs sm:text-sm font-semibold text-foreground">
            Saldo do mês
          </div>
          <span className="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 hidden group-hover:block w-max max-w-[200px] px-2 py-1 rounded bg-slate-900 text-white text-[10px] shadow z-10">
            Ganhos menos Gastos do mês
          </span>
        </CardContent>
      </Card>


      {/* Saldo Acumulado */}
      <Card
        className="group relative order-3 cursor-pointer flex flex-col h-full min-h-[150px] overflow-hidden"
        aria-label="Saldo Acumulado"
        data-tour="card-accumulated"
      >
        <CardContent className="p-2 flex flex-col flex-1">
          <div className="flex flex-1 items-center justify-between gap-2">
            <AutoFitNumber
              value={formatCurrency(saldoAcumulado)}
              className="text-indigo-600 dark:text-indigo-400"
              max={40}
              min={18}
            />
            <DollarSign className="hidden 2xl:block h-7 w-7 text-indigo-500/80" />
          </div>
          <div className="mt-1 text-center text-xs sm:text-sm font-semibold text-foreground">
            Saldo Acumulado
          </div>
          <span className="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 hidden group-hover:block w-max max-w-[210px] px-2 py-1 rounded bg-slate-900 text-white text-[10px] shadow z-10">
            Ganhos - Gastos de todos os meses até o selecionado
          </span>
        </CardContent>
      </Card>

      {/* Limite Diário */}
      <Card
        className="group relative order-5 flex flex-col h-full min-h-[150px] overflow-hidden col-span-2 lg:col-span-1"
        aria-label="Limite Diário"
        data-tour="card-daily-limit"
      >
        <CardContent className="p-2 flex flex-col flex-1">
          <div className="flex flex-1 items-center justify-between gap-2">
            <AutoFitNumber
              value={formatCurrency(limiteDiario)}
              className="text-orange-500"
              max={40}
              min={16}
            />
            <span className="hidden 2xl:inline-block text-lg select-none" aria-hidden>
              💸
            </span>
          </div>
          <div className="mt-1 text-center text-xs sm:text-sm font-semibold text-foreground">
            Limite Diário
          </div>
          <span className="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 hidden group-hover:block w-max max-w-[210px] px-2 py-1 rounded bg-slate-900 text-white text-[10px] shadow z-10">
            Gasto médio diário restante para manter saldo ≥ 0
          </span>
        </CardContent>
      </Card>

    </div>
  );
}

/**
 * Date Navigation Header
 */
function DateNavigationHeader({
  monthYearLabel,
  isAtCurrentMonth,
  currentDate,
  onPreviousMonth,
  onNextMonth,
  onDateChange,
  onTourClick,
  wallets,
  selectedWallet,
  setSelectedWallet,
}: {
  monthYearLabel: string;
  isAtCurrentMonth: boolean;
  currentDate: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onDateChange: (date: Date) => void;
  onTourClick?: () => void;
  wallets: Array<{ id: string; name: string; type: string }>;
  selectedWallet: string[];
  setSelectedWallet: (v: string[]) => void;
}): JSX.Element {
  const [monthSelectorOpen, setMonthSelectorOpen] = useState(false);

  // Função para lidar com mudança do seletor de data
  const handleDateChange = (year: number, month: number) => {
    onDateChange(new Date(year, month - 1, 1));
    setMonthSelectorOpen(false);
  };

  // Gerar lista de anos (3 anos para trás e 2 para frente)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - 3 + i);
  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  return (
    <div className="flex w-full sm:w-auto items-center gap-1 sm:gap-2 flex-wrap">
      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onPreviousMonth}
          aria-label="Mês anterior"
          className="h-10 w-10 rounded-full border border-slate-300/60 dark:border-white/15 bg-white/40 dark:bg-slate-700/40 hover:bg-white/60 dark:hover:bg-slate-700/60 shadow-sm backdrop-blur-sm"
        >
          <ArrowLeft className="h-5 w-5 stroke-[2.5] text-slate-700 dark:text-slate-200" />
        </Button>
      
      <Popover open={monthSelectorOpen} onOpenChange={setMonthSelectorOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-10 px-4 min-w-[160px] justify-between border border-slate-300/70 bg-white/90 hover:bg-white text-slate-900 shadow-sm backdrop-blur-sm dark:bg-slate-800/60 dark:border-white/15 dark:text-slate-100 dark:hover:bg-slate-800/80"
          >
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-slate-700 dark:text-slate-200" />
              <span className="font-medium text-sm sm:text-base">
                {monthYearLabel.charAt(0).toUpperCase() + monthYearLabel.slice(1)}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-700 dark:text-slate-200" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-4">
            <div>
              <Label htmlFor="year-select" className="text-sm font-medium mb-2 block">
                Ano
              </Label>
              <Select
                id="year-select"
                value={currentDate.getFullYear().toString()}
                onChange={(e) => {
                  const newYear = parseInt(e.target.value);
                  handleDateChange(newYear, currentDate.getMonth() + 1);
                }}
                className="w-full"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="month-select" className="text-sm font-medium mb-2 block">
                Mês
              </Label>
              <Select
                id="month-select"
                value={(currentDate.getMonth() + 1).toString()}
                onChange={(e) => {
                  const newMonth = parseInt(e.target.value);
                  handleDateChange(currentDate.getFullYear(), newMonth);
                }}
                className="w-full"
              >
                {months.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </Select>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="icon"
        onClick={onNextMonth}
        disabled={isAtCurrentMonth}
        aria-disabled={isAtCurrentMonth}
        aria-label="Próximo mês"
        className="h-10 w-10 rounded-full border border-slate-300/60 dark:border-white/15 bg-white/40 dark:bg-slate-700/40 hover:bg-white/60 dark:hover:bg-slate-700/60 shadow-sm backdrop-blur-sm disabled:opacity-50"
      >
        <ArrowRight className="h-5 w-5 stroke-[2.5] text-slate-700 dark:text-slate-200" />
      </Button>
      </div>
      
      {/* Wallet Filter */}
      <div className="w-full sm:w-auto min-w-[200px]">
        <WalletMultiSelect
          wallets={wallets}
          value={selectedWallet}
          onChange={setSelectedWallet}
        />
      </div>
      
      {onTourClick && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onTourClick}
          className="ml-2 hidden sm:inline-flex"
          aria-label="Iniciar tour"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 3.5-2.5 6.5-5.5 7.5a1.5 1.5 0 0 1-3 0C7.5 15.5 5 12.5 5 9a7 7 0 0 1 7-7z"
            />
          </svg>
        </Button>
      )}
    </div>
  );
}

/**
 * Modal for displaying detailed category breakdowns
 */
function DetailModal({
  open,
  onClose,
  type,
  summary,
}: {
  open: boolean;
  onClose: () => void;
  type: null | 'income' | 'expense' | 'balance' | 'diff';
  summary: Summary;
}): JSX.Element | null {
  if (!open || !type) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        type === 'income'
          ? 'Ganhos do mês'
          : type === 'expense'
            ? 'Gastos do mês'
            : type === 'balance'
              ? 'Ganhos e Gastos do mês'
              : type === 'diff'
                ? 'Variação por Categoria (vs mês anterior)'
                : ''
      }
    >
      {type === 'income' && (
        <div className="mt-4">
          {(summary.incomesByCategoryComplete || summary.incomesByCategory).length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum ganho encontrado.</div>
          ) : (
            <ul className="space-y-2">
              {[...(summary.incomesByCategoryComplete || summary.incomesByCategory)]
                .sort((a, b) => b.amount - a.amount)
                .map((item) => (
                  <li key={item.category} className="flex justify-between items-center">
                    <span>{item.category}</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(item.amount)}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      {type === 'expense' && (
        <div className="mt-4">
          {(summary.expensesByCategoryComplete || summary.expensesByCategory).length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum gasto encontrado.</div>
          ) : (
            <ul className="space-y-2">
              {[...(summary.expensesByCategoryComplete || summary.expensesByCategory)]
                .sort((a, b) => b.amount - a.amount)
                .map((item) => (
                  <li key={item.category} className="flex justify-between items-center">
                    <span>{item.category}</span>
                    <span className="font-semibold text-red-600">
                      {formatCurrency(item.amount)}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      {type === 'balance' && (
        <div className="space-y-6 mt-4">
          <div>
            <div className="font-semibold mb-2">Ganhos</div>
            {summary.incomesByCategory.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhum ganho encontrado.</div>
            ) : (
              <ul className="space-y-2">
                {[...(summary.incomesByCategoryComplete || summary.incomesByCategory)]
                  .sort((a, b) => b.amount - a.amount)
                  .map((item) => (
                    <li key={item.category} className="flex justify-between items-center">
                      <span>{item.category}</span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(item.amount)}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
          <div>
            <div className="font-semibold mb-2">Gastos</div>
            {summary.expensesByCategory.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhum gasto encontrado.</div>
            ) : (
              <ul className="space-y-2">
                {[...(summary.expensesByCategoryComplete || summary.expensesByCategory)]
                  .sort((a, b) => b.amount - a.amount)
                  .map((item) => (
                    <li key={item.category} className="flex justify-between items-center">
                      <span>{item.category}</span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(item.amount)}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {type === 'diff' && (
        <div className="mt-4">
          {(summary.expenseDiffAllComplete || summary.expenseDiffAll).length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhuma variação encontrada.</div>
          ) : (
            <ul className="space-y-2 max-h-[60vh] overflow-auto pr-1">
              {(summary.expenseDiffAllComplete || summary.expenseDiffAll).map((item) => (
                <li
                  key={item.category}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b last:border-b-0 pb-2"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-foreground break-words">{item.category}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm font-mono whitespace-nowrap">
                    <span className="text-muted-foreground">
                      {formatCurrency(item.prevAmount || 0)} → {formatCurrency(item.amount)}
                    </span>
                    <span
                      className={
                        item.diff > 0
                          ? 'font-semibold text-red-600'
                          : 'font-semibold text-green-600'
                      }
                    >
                      {item.diff > 0 ? '+' : ''}
                      {formatCurrency(item.diff)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            Mostrando somente categorias cujo valor mudou em relação ao mês anterior.
          </p>
        </div>
      )}
    </Modal>
  );
}

/**
 * Main component
 */
export function DashboardCards({
  totalIncome,
  totalExpenses,
  saldoDoMes,
  saldoAcumulado,
  limiteDiario,
  summary,
  monthYearLabel,
  isAtCurrentMonth,
  currentDate,
  onPreviousMonth,
  onNextMonth,
  onDateChange,
  modal,
  setModal,
  quickAddOpen,
  setQuickAddOpen,
  quickTab,
  setQuickTab,
  onTourClick,
  onQuickAddSuccess,
  smartInsights,
  wallets,
  selectedWallet,
  setSelectedWallet,
}: DashboardCardsProps): JSX.Element {
  return (
    <>
      {/* Header with date navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div data-tour="dashboard-title">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-foreground">Visão geral das suas finanças</p>
        </div>
        <DateNavigationHeader
          monthYearLabel={monthYearLabel}
          isAtCurrentMonth={isAtCurrentMonth}
          currentDate={currentDate}
          onPreviousMonth={onPreviousMonth}
          onNextMonth={onNextMonth}
          onDateChange={onDateChange}
          onTourClick={onTourClick}
          wallets={wallets}
          selectedWallet={selectedWallet}
          setSelectedWallet={setSelectedWallet}
        />
      </div>

      {/* Smart Insights Widget */}
      {smartInsights && Array.isArray(smartInsights) && smartInsights.length > 0 && (
        <SmartInsightsWidget insights={smartInsights} />
      )}

      {/* Summary Cards */}
      <SummaryCards
        totalIncome={totalIncome}
        totalExpenses={totalExpenses}
        saldoDoMes={saldoDoMes}
        saldoAcumulado={saldoAcumulado}
        limiteDiario={limiteDiario}
        onCardClick={(type) => setModal(type)}
      />

      {/* Quick Add FAB */}
      <Fab
        onClick={() => {
          setQuickAddOpen(true);
          setQuickTab('despesa');
        }}
        label="Quick Add"
      />

      {/* Quick Add Modal */}
      <Modal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} title="Adicionar rápido">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              type="button"
              onClick={() => setQuickTab('despesa')}
              className={`border rounded-md py-2 px-3 transition-colors text-sm font-medium
                ${
                  quickTab === 'despesa'
                    ? 'bg-primary text-white border-primary shadow'
                    : 'bg-muted text-foreground border-border hover:bg-accent hover:text-accent-foreground'
                }
              `}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => setQuickTab('renda')}
              className={`border rounded-md py-2 px-3 transition-colors text-sm font-medium
                ${
                  quickTab === 'renda'
                    ? 'bg-primary text-white border-primary shadow'
                    : 'bg-muted text-foreground border-border hover:bg-accent hover:text-accent-foreground'
                }
              `}
            >
              Ganho
            </button>
            <button
              type="button"
              onClick={() => setQuickTab('cartao')}
              className={`border rounded-md py-2 px-3 transition-colors text-sm font-medium
                ${
                  quickTab === 'cartao'
                    ? 'bg-primary text-white border-primary shadow'
                    : 'bg-muted text-foreground border-border hover:bg-accent hover:text-accent-foreground'
                }
              `}
            >
              Cartão
            </button>
            <button
              type="button"
              onClick={() => setQuickTab('transferencia')}
              className={`border rounded-md py-2 px-3 transition-colors text-sm font-medium
                ${
                  quickTab === 'transferencia'
                    ? 'bg-primary text-white border-primary shadow'
                    : 'bg-muted text-foreground border-border hover:bg-accent hover:text-accent-foreground'
                }
              `}
            >
              Transferir
            </button>
          </div>
          <div className="mt-4">
            {quickTab === 'despesa' ? (
              <QuickDespesaForm />
            ) : quickTab === 'renda' ? (
              <QuickRendaForm />
            ) : quickTab === 'cartao' ? (
              <QuickCardForm onSuccess={onQuickAddSuccess} />
            ) : (
              <QuickTransferForm onSuccess={onQuickAddSuccess} />
            )}
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <DetailModal open={modal !== null} onClose={() => setModal(null)} type={modal} summary={summary} />
    </>
  );
}
