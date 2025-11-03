'use client';

/**
 * Dashboard Content Component - Refatorado
 *
 * Componente principal do dashboard que orquestra:
 * 1. Hook de gerenciamento de estado (use-dashboard-state)
 * 2. Componente de cards (dashboard-cards)
 * 3. Componente de gráficos (dashboard-charts)
 * 4. Tour/onboarding
 *
 * Redução de ~1100 para ~50 linhas através da separação de responsabilidades.
 * Cada componente tem responsabilidade bem definida e é independente.
 */

import { useDashboardState } from '@/hooks/use-dashboard-state';
import { DashboardCards } from './dashboard-cards';
import { DashboardCharts } from './dashboard-charts';
import OnboardingTour from '@/components/OnboardingTour';

/**
 * Componente DashboardContent
 *
 * Responsabilidades:
 * - Orquestrar o hook de estado (use-dashboard-state)
 * - Renderizar componentes filhos com props apropriados
 * - Gerenciar tour/onboarding
 *
 * Não tem lógica de estado ou efeitos - tudo está no hook.
 * Apenas passa os dados do hook para os componentes.
 */
export function DashboardContent() {
  // Usar o hook que centraliza TODO o gerenciamento de estado
  // Retorna 50+ valores/setters, 3 useEffects, demo mode, etc
  const state = useDashboardState();

  // Renderizar componentes
  return (
    <div className="space-y-4 flex-1 min-h-screen flex flex-col px-2 sm:px-4 pb-24">
      {/* Cards com 5 cards + Quick Add */}
      <DashboardCards
        totalIncome={state.totalIncome}
        totalExpenses={state.totalExpenses}
        saldoDoMes={state.saldoDoMes}
        saldoAcumulado={state.saldoAcumulado}
        limiteDiario={state.limiteDiario}
        summary={state.summary}
        monthYearLabel={`${state.currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`}
        isAtCurrentMonth={state.isAtCurrentMonth}
        onPreviousMonth={state.handlePreviousMonth}
        onNextMonth={state.handleNextMonth}
        modal={state.modal}
        setModal={state.setModal}
        quickAddOpen={state.quickAddOpen}
        setQuickAddOpen={state.setQuickAddOpen}
        quickTab={state.quickTab}
        setQuickTab={state.setQuickTab}
        onTourClick={() => state.setTourOpen(true)}
        onQuickAddSuccess={state.handleQuickAddSuccess}
      />

      {/* Gráficos */}
      <DashboardCharts
        summary={state.summary}
        dailyByCategory={state.dailyByCategory}
        dailyByWallet={state.dailyByWallet}
        dailyByTag={state.dailyByTag}
        wallets={state.wallets}
        tagNames={state.tagNames}
        chartsLoaded={state.chartsLoaded}
        loadingDaily={state.loadingDaily}
        isLoading={state.isLoading}
        setModal={state.setModal}
        modal={state.modal}
        isDemoMode={state.isDemoMode}
      />


      {/* Tour */}
      <OnboardingTour open={state.tourOpen} onClose={() => state.setTourOpen(false)} />
    </div>
  );
}
