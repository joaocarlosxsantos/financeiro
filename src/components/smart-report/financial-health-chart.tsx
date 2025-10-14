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
      height: Math.max((item.score / 100) * 100, 4), // Altura baseada em percentual de 100, mín 4%
      isLastMonth: index === data.length - 1
    }));
  }, [data]);

  const trend = useMemo(() => {
    if (data.length < 2) return 0;
    return data[data.length - 1].score - data[data.length - 2].score;
  }, [data]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-gradient-to-t from-green-500 to-green-400';
    if (score >= 60) return 'bg-gradient-to-t from-yellow-500 to-yellow-400';
    return 'bg-gradient-to-t from-red-500 to-red-400';
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
            <div className="flex items-end justify-between h-40 gap-2 sm:gap-3">
              {chartData.map((item, index) => (
                <div key={item.month} className="flex flex-col items-center flex-1 group">
                  <div className="relative w-full max-w-[60px] flex flex-col items-center">
                    {/* Valor acima da barra - sempre visível em mobile */}
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {item.score}
                    </div>
                    {/* Barra */}
                    <div 
                      className={cn(
                        "w-full rounded-t-lg transition-all duration-500 hover:scale-105 border-b-3 shadow-sm",
                        getScoreColor(item.score),
                        getScoreBorderColor(item.score),
                        item.isLastMonth && "ring-2 ring-blue-500/40 ring-offset-2 dark:ring-offset-gray-900"
                      )}
                      style={{ height: `${item.height}%`, minHeight: '16px' }}
                    />
                    {/* Score dentro da barra para barras maiores */}
                    {item.height > 25 && (
                      <div 
                        className="absolute text-xs font-bold text-white mix-blend-difference hidden sm:block"
                        style={{ bottom: `${Math.max(item.height / 2, 12)}%` }}
                      >
                        {item.score}
                      </div>
                    )}
                  </div>
                  {/* Mês */}
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-3 text-center font-medium">
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
              <div className="w-3 h-3 bg-gradient-to-t from-green-500 to-green-400 rounded-full border border-green-600"></div>
              <span className="font-medium">Excelente (80+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gradient-to-t from-yellow-500 to-yellow-400 rounded-full border border-yellow-600"></div>
              <span className="font-medium">Boa (60-79)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gradient-to-t from-red-500 to-red-400 rounded-full border border-red-600"></div>
              <span className="font-medium">Atenção (&lt;60)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}