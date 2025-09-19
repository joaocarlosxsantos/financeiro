"use client";

import React, { useState, useEffect } from 'react';
import Joyride, { CallBackProps, Step } from 'react-joyride';

type OnboardingProps = {
  open?: boolean;
  onClose?: () => void;
};

export default function OnboardingTour({ open = false, onClose }: OnboardingProps) {
  const [run, setRun] = useState(open);

  useEffect(() => {
    setRun(open);
  }, [open]);

  const steps: Step[] = [
    // Header
    { target: '[data-tour="dashboard-title"]', content: 'Visão geral do seu Dashboard e título da página.', placement: 'bottom' },
    // Cards (um a um)
    { target: '[data-tour="card-income"]', content: 'Ganhos totais do período selecionado.', placement: 'bottom' },
    { target: '[data-tour="card-expense"]', content: 'Gastos totais do período selecionado.', placement: 'bottom' },
    { target: '[data-tour="cards-totals"]', content: 'Saldo do mês: Ganhos menos Gastos.', placement: 'bottom' },
    { target: '[data-tour="card-daily-limit"]', content: 'Limite diário estimado para manter o saldo.', placement: 'bottom' },
    { target: '[data-tour="card-accumulated"]', content: 'Saldo acumulado até o mês selecionado.', placement: 'bottom' },
    // Gráficos principais
    { target: '[data-tour="chart-income-category"]', content: 'Ganhos por categoria (Top 5).', placement: 'top' },
    { target: '[data-tour="chart-expense-category"]', content: 'Gastos por categoria (Top 5).', placement: 'top' },
    { target: '[data-tour="chart-daily-category"]', content: 'Gasto diário por categoria.', placement: 'top' },
    { target: '[data-tour="chart-daily-wallet"]', content: 'Gasto diário por carteira.', placement: 'top' },
    { target: '[data-tour="chart-daily-tag"]', content: 'Gasto diário por tag.', placement: 'top' },
    { target: '[data-tour="chart-daily-balance"]', content: 'Evolução diária do saldo.', placement: 'top' },
    { target: '[data-tour="chart-balance-projection"]', content: 'Projeção do saldo final do mês.', placement: 'top' },
    { target: '[data-tour="chart-monthly-bar"]', content: 'Ganhos vs Gastos (12 meses).', placement: 'top' },
    { target: '[data-tour="chart-top-categories"]', content: 'Top 5 categorias de gasto e variações.', placement: 'top' },
    // Sidebar (topo -> itens)
    { target: '[data-tour="sidebar-dashboard"]', content: 'Acesse o Dashboard a qualquer momento.', placement: 'right' },
    { target: '[data-tour="sidebar-incomes"]', content: 'Área de Ganhos (rendas).', placement: 'right' },
    { target: '[data-tour="sidebar-expenses"]', content: 'Área de Gastos (despesas).', placement: 'right' },
    { target: '[data-tour="sidebar-wallets"]', content: 'Gerencie suas carteiras e saldos aqui.', placement: 'right' },
    { target: '[data-tour="sidebar-categories"]', content: 'Gerencie categorias de gastos/receitas.', placement: 'right' },
    { target: '[data-tour="sidebar-tags"]', content: 'Gerencie tags para classificar lançamentos.', placement: 'right' },
    { target: '[data-tour="sidebar-reports"]', content: 'Acesse relatórios e exporte seus dados.', placement: 'right' },
    { target: '[data-tour="sidebar-import"]', content: 'Importe extratos bancários por aqui.', placement: 'right' },
  ];

  const handleCallback = (data: CallBackProps) => {
    const { status, index, action, step } = data;
    // If the next step targets the sidebar and we're on a small screen, request opening the sidebar
    try {
      const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false;
      // When action is 'next' (user advanced) or when starting the tour (first index), check the upcoming step
      if (isMobile && typeof index === 'number') {
        // Joyride indexes the current step in `index`; the next step will be index + 1 when action is 'next'
        const upcoming = (data as any).index != null && (data as any).action === 'next' ? (data as any).index + 1 : (data as any).index;
        const stepsList: Step[] = (steps as Step[]);
        const targetStep = stepsList && stepsList[upcoming];
        if (targetStep && typeof targetStep.target === 'string' && targetStep.target.startsWith('[data-tour="sidebar-"')) {
          // dispatch custom event to open sidebar in the layout
          window.dispatchEvent(new CustomEvent('openSidebar'));
        }
      }

    } catch (e) {
      // noop
    }

    if (status === 'finished' || status === 'skipped') {
      setRun(false);
      if (onClose) onClose();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      styles={{
        options: {
          zIndex: 10000,
        },
        overlay: {
          // usa a cor de background do site com opacidade para destacar o conteúdo
          background: 'hsl(var(--background) / 0.6)'
        },
        tooltip: {
          // tooltip com background de card e texto do card-foreground
          backgroundColor: 'hsl(var(--card))',
          color: 'hsl(var(--card-foreground))',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(2,6,23,0.12)',
          padding: 16
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
          padding: '10px 16px',
          borderRadius: 10,
          fontWeight: 700,
          boxShadow: '0 8px 20px rgba(2,6,23,0.18)',
          border: 'none'
        },
        buttonBack: {
          backgroundColor: 'transparent',
          color: 'hsl(var(--muted-foreground))',
          padding: '8px 12px',
          borderRadius: 10,
          fontWeight: 600,
          border: '1px solid rgba(255,255,255,0.06)',
          marginRight: 8
        },
        buttonClose: {
          color: 'hsl(var(--muted-foreground))',
          padding: '6px',
          fontWeight: 600
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground))',
          padding: '8px 10px',
          textDecoration: 'underline',
          fontWeight: 600
        }
      }}
      locale={{
        back: 'Voltar',
        close: 'Fechar',
        last: 'Concluir',
        next: 'Próximo',
        skip: 'Pular',
      }}
      callback={handleCallback}
    />
  );
}
