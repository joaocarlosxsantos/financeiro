'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthScoreData {
  month: string;
  score: number;
}

interface FinancialHealthChartProps {
  data: HealthScoreData[];
}

export function FinancialHealthChart({ data }: FinancialHealthChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map((item, index) => ({
      ...item,
      displayMonth: new Date(item.month + '-01').toLocaleDateString('pt-BR', { 
        month: 'short' 
      }).replace('.', ''),
  height: (item.score / 100) * 100, // Altura proporcional ao score
      isLastMonth: index === data.length - 1
    }));
  }, [data]);

  const trend = useMemo(() => {
    if (data.length < 2) return 0;
    return data[data.length - 1].score - data[data.length - 2].score;
  }, [data]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreBorderColor = (score: number) => {
    if (score >= 80) return 'border-green-500';
    if (score >= 60) return 'border-yellow-500';
    return 'border-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Evolução da Saúde Financeira
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span>Últimos 6 meses</span>
          {trend !== 0 && (
            <div className="flex items-center gap-1">
              {trend > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
              <span className={cn(
                "font-medium",
                trend > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {trend > 0 ? '+' : ''}{trend.toFixed(0)} pontos
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Gráfico de barras melhorado */}
          <div className="relative bg-gray-50/50 dark:bg-gray-800/30 rounded-lg p-4">
            <div className="relative h-40 flex items-end justify-between gap-2 sm:gap-3">
              {chartData.map((item, index) => (
                <div key={item.month} className="flex flex-col items-center flex-1 group h-full relative">
                  {/* Barra posicionada proporcionalmente */}
                  <div
                    className={cn(
                      "absolute left-1/2 -translate-x-1/2 w-8 rounded-t-lg transition-all duration-500 hover:scale-105 border-b-3 shadow-sm flex flex-col items-center",
                      getScoreColor(item.score),
                      getScoreBorderColor(item.score),
                      item.isLastMonth && "ring-2 ring-blue-500/40 ring-offset-2 dark:ring-offset-gray-900"
                    )}
                    style={{
                      bottom: 0,
                      height: `${item.score * 1.6}px`, // 100 pontos = 160px, 50 pontos = 80px, etc
                      minHeight: '2px',
                    }}
                  >
                    {/* Score dentro da barra */}
                    {item.score > 10 && (
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-gray-700 dark:text-gray-200">
                        {item.score}
                      </span>
                    )}
                  </div>
                  {/* Mês */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs text-gray-600 dark:text-gray-400 mt-3 text-center font-medium">
                    {item.displayMonth}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Linha de referência para 100 pontos */}
            <div className="absolute top-4 left-0 right-0 border-t border-dashed border-gray-300 dark:border-gray-600 opacity-50"></div>
            <div className="absolute top-2 right-2 text-xs text-gray-500 dark:text-gray-400">100</div>
            
            {/* Linha de referência para 50 pontos */}
            <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-gray-300 dark:border-gray-600 opacity-30 translate-y-2"></div>
            <div className="absolute top-1/2 right-2 text-xs text-gray-500 dark:text-gray-400 translate-y-2">50</div>
            
            {/* Linha de referência para 0 pontos */}
            <div className="absolute bottom-4 left-0 right-0 border-t border-dashed border-gray-300 dark:border-gray-600 opacity-20"></div>
            <div className="absolute bottom-2 right-2 text-xs text-gray-500 dark:text-gray-400">0</div>
          </div>

          {/* Legenda melhorada */}
          <div className="flex flex-wrap justify-center gap-4 text-xs bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full border border-green-600"></div>
              <span className="font-medium">Excelente (80+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full border border-yellow-600"></div>
              <span className="font-medium">Boa (60-79)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full border border-red-600"></div>
              <span className="font-medium">Atenção (&lt;60)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}