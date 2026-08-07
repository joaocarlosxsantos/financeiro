'use client';

/**
 * Dashboard Charts Component
 *
 * Exibe todos os gráficos do dashboard:
 * - 2 gráficos de pizza (Ganhos/Gastos por categoria)
 * - 3 gráficos diários (Category, Wallet, Tag)
 * - 2 gráficos de evolução (Daily Balance, Projection)
 * - 1 gráfico mensal (Monthly Bar)
 * - 1 gráfico de top categorias (Top 5)
 * - 5 modais ampliados para cada gráfico
 *
 * @component
 * @example
 * const state = useDashboardState();
 * return <DashboardCharts {...state} />
 */

import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';

// Dynamic imports para gráficos (lazy loading)
const DailyCategoryChart = dynamic(
  () => import('./daily-category-chart').then((mod) => mod.DailyCategoryChart),
  { ssr: false, loading: () => <div>Carregando gráfico...</div> },
);

const DailyWalletChart = dynamic(
  () => import('./daily-wallet-chart').then((mod) => mod.DailyWalletChart),
  { ssr: false, loading: () => <div>Carregando gráfico...</div> },
);

const DynamicDailyTagChart = dynamic(
  () => import('./daily-tag-chart').then((mod) => mod.DailyTagChart),
  { ssr: false, loading: () => <div>Carregando gráfico...</div> },
);

const ExpenseChart = dynamic(
  () => import('./expense-chart').then((mod) => mod.ExpenseChart),
  { ssr: false, loading: () => <div>Carregando gráfico...</div> },
);

const IncomeChart = dynamic(
  () => import('./income-chart').then((mod) => mod.IncomeChart),
  { ssr: false, loading: () => <div>Carregando gráfico...</div> },
);

const MonthlyBarChart = dynamic(
  () => import('./monthly-bar-chart').then((mod) => mod.MonthlyBarChart),
  { ssr: false, loading: () => <div>Carregando gráfico...</div> },
);

const TopExpenseCategoriesChart = dynamic(
  () => import('./top-expense-categories-chart').then((mod) => mod.TopExpenseCategoriesChart),
  { ssr: false, loading: () => <div>Carregando gráfico...</div> },
);

import { DailyBalanceChart } from '@/components/dashboard/daily-balance-chart';
import { BalanceProjectionChart } from '@/components/dashboard/balance-projection-chart';
import { EnhancedBalanceProjectionChart, calculateEnhancedProjection } from '@/components/dashboard/enhanced-balance-projection-chart';
import { FinancialHealthCard, HealthScoreData } from '@/components/dashboard/financial-health-card';
import { MonthComparisonCard, MonthComparisonData } from '@/components/dashboard/month-comparison-card';
import { QuickInsightsCard, QuickInsightsData } from '@/components/dashboard/quick-insights-card';

/**
 * Props para o componente DashboardCharts
 * Aceita estados do hook use-dashboard-state
 */
interface DashboardChartsProps {
  /** Dados resumidos com categorias, valores e cores */
  summary: {
    expensesByCategory: Array<{ category: string; amount: number; color: string }>;
    incomesByCategory: Array<{ category: string; amount: number; color: string }>;
    monthlyData: Array<{ month: string; income: number; expense: number; balance: number }>;
    topExpenseCategories: Array<{ category: string; amount: number; diff: number; prevAmount?: number }>;
    expenseDiffAll: Array<{ category: string; amount: number; diff: number; prevAmount: number }>;
    dailyBalanceData: Array<{ date: string; balance: number }>;
    balanceProjectionData: Array<{
      day: number;
      real?: number | undefined;
      baselineLinear?: number | undefined;
    }>;
  };

  /** Dados diários agrupados por categoria - estrutura flexível */
  dailyByCategory: any[];

  /** Dados diários agrupados por carteira - estrutura flexível */
  dailyByWallet: any[];

  /** Dados diários agrupados por tag - estrutura flexível */
  dailyByTag: any[];

  /** Metadados de carteiras (id, nome, type) */
  wallets: Array<{ id: string; name: string; type?: string; color?: string }>;

  /** Nomes de tags para mapeamento */
  tagNames?: Record<string, string>;

  /** Estado de carregamento dos gráficos */
  chartsLoaded: boolean;

  /** Estado de carregamento dos dados diários */
  loadingDaily: boolean;

  /** Estado geral de carregamento */
  isLoading: boolean;

  /** Callback para abrir modal detalhado de gastos */
  setModal: (modal: null | 'income' | 'expense' | 'balance' | 'diff') => void;

  /** Callback para fechar modal detalhado */
  modal: null | 'income' | 'expense' | 'balance' | 'diff';

  /** Dados de tag para renderização mobile */
  tagData?: Array<{ tag: string; amount: number }>;

  /** Modo demo habilitado */
  isDemoMode?: boolean;

  /** Dados para o card de saúde financeira */
  healthScoreData?: HealthScoreData;

  /** Dados para comparação mensal */
  monthComparisonData?: MonthComparisonData | null;

  /** Dados para insights rápidos */
  quickInsightsData?: QuickInsightsData;
}

/**
 * Componente principal que renderiza todos os gráficos do dashboard
 * Organizados em 4 seções:
 * 1. Resumo por categoria (pizzas - top 5)
 * 2. Gráficos diários (categoria, carteira, tag)
 * 3. Gráficos de evolução (saldo diário, projeção)
 * 4. Análise mensal e top categorias
 */
export function DashboardCharts({
  summary,
  dailyByCategory,
  dailyByWallet,
  dailyByTag,
  wallets,
  tagNames = {},
  chartsLoaded,
  loadingDaily,
  isLoading,
  setModal,
  modal,
  tagData = [],
  isDemoMode = false,
  healthScoreData,
  monthComparisonData,
  quickInsightsData,
}: DashboardChartsProps): JSX.Element {
  // Removida a variável isMobile pois não é mais usada após remoção dos modais

  return (
    <>
      {/* SEÇÃO 1: Cards de Insights - 3 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
        {healthScoreData && <FinancialHealthCard data={healthScoreData} />}
        {monthComparisonData && <MonthComparisonCard data={monthComparisonData} />}
        {quickInsightsData && <QuickInsightsCard data={quickInsightsData} />}
      </div>

      {/* SEÇÃO 2: Evolução do Saldo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
        <Card data-tour="chart-daily-balance">
          <CardHeader>
            <CardTitle>📊 Evolução do Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            {!chartsLoaded && loadingDaily ? (
              <Loader text="Carregando gráfico de saldo..." />
            ) : chartsLoaded && summary.dailyBalanceData.length > 0 ? (
              <DailyBalanceChart data={summary.dailyBalanceData} />
            ) : (
              <div className="text-sm text-muted-foreground">
                Sem dados para o período selecionado
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-tour="chart-balance-projection">
          <CardHeader>
            <CardTitle>🔮 Projeção de Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            {!chartsLoaded && loadingDaily ? (
              <Loader text="Carregando projeção..." />
            ) : chartsLoaded && summary.dailyBalanceData.length > 0 ? (
              <EnhancedBalanceProjectionChart 
                data={calculateEnhancedProjection(
                  summary.dailyBalanceData.map(d => d.balance),
                  31
                )} 
              />
            ) : (
              <div className="text-sm text-muted-foreground">
                Sem dados para o período selecionado
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SEÇÃO 3: Distribuição por Categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
        <Card data-tour="chart-expense-category">
          <CardHeader>
            <CardTitle>💸 Gastos por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader text="Carregando gastos..." />
            ) : summary.expensesByCategory.length > 0 ? (
              <ExpenseChart data={summary.expensesByCategory} maxItems={5} />
            ) : (
              <div className="text-sm text-muted-foreground">
                Sem dados para o período selecionado
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-tour="chart-income-category">
          <CardHeader>
            <CardTitle>💰 Ganhos por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader text="Carregando ganhos..." />
            ) : summary.incomesByCategory.length > 0 ? (
              <IncomeChart data={summary.incomesByCategory} maxItems={5} />
            ) : (
              <div className="text-sm text-muted-foreground">
                Sem dados para o período selecionado
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SEÇÃO 4: Análise Mensal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
        <Card data-tour="chart-monthly-bar">
          <CardHeader>
            <CardTitle>📅 Últimos 12 Meses</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader text="Carregando dados mensais..." />
            ) : summary.monthlyData.length > 0 ? (
              <MonthlyBarChart data={summary.monthlyData} />
            ) : (
              <div className="text-sm text-muted-foreground">
                Sem dados para o período selecionado
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-tour="chart-top-categories">
          <CardHeader>
            <CardTitle>🏆 Top Categorias</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader text="Carregando categorias..." />
            ) : summary.topExpenseCategories.length > 0 ? (
              <TopExpenseCategoriesChart data={summary.topExpenseCategories} />
            ) : (
              <div className="text-sm text-muted-foreground">
                Sem dados para o período selecionado
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SEÇÃO 5: Análise Diária Detalhada */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
        <Card data-tour="chart-daily-category">
          <CardHeader>
            <CardTitle className="text-base">📈 Diário por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {!chartsLoaded && loadingDaily ? (
              <Loader text="Carregando gráfico diário..." />
            ) : chartsLoaded && dailyByCategory.length > 0 ? (
              <DailyCategoryChart
                data={dailyByCategory}
                categoryColors={Object.fromEntries(
                  summary.expensesByCategory.map((c) => [c.category, c.color]),
                )}
              />
            ) : (
              <div className="text-sm text-muted-foreground">
                Sem dados para o período selecionado
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-tour="chart-daily-wallet">
          <CardHeader>
            <CardTitle className="text-base">👛 Diário por Carteira</CardTitle>
          </CardHeader>
          <CardContent>
            {!chartsLoaded && loadingDaily ? (
              <Loader text="Carregando gráfico diário..." />
            ) : chartsLoaded && dailyByWallet.length > 0 ? (
              <DailyWalletChart 
                data={dailyByWallet} 
                walletsMeta={wallets.map((w) => ({ name: w.name, type: w.type || 'cash' }))} 
              />
            ) : (
              <div className="text-sm text-muted-foreground">
                Sem dados para o período selecionado
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-tour="chart-daily-tag">
          <CardHeader>
            <CardTitle className="text-base">🏷️ Diário por Tag</CardTitle>
          </CardHeader>
          <CardContent>
            {!chartsLoaded && loadingDaily ? (
              <Loader text="Carregando gráfico diário..." />
            ) : chartsLoaded && dailyByTag.length > 0 ? (
              <DynamicDailyTagChart data={dailyByTag} tagNames={tagNames} />
            ) : (
              <div className="text-sm text-muted-foreground">
                Sem dados para o período selecionado
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
