'use client';

/**
 * Enhanced Balance Projection Chart
 * 
 * Gráfico aprimorado de projeção de saldo com:
 * - Múltiplos cenários (otimista, realista, pessimista)
 * - Banda de confiança visual
 * - Previsão mais precisa baseada em padrões históricos
 * - Probabilidade de atingir diferentes faixas de saldo
 * 
 * @component
 */

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Area,
  ComposedChart,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, AlertCircle } from 'lucide-react';

export interface EnhancedProjectionPoint {
  day: number;
  real?: number;
  realistic?: number; // Cenário realista (base)
  optimistic?: number; // Cenário otimista (+20%)
  pessimistic?: number; // Cenário pessimista (-20%)
  upperBound?: number; // Limite superior banda de confiança
  lowerBound?: number; // Limite inferior banda de confiança
}

interface ProjectionScenario {
  label: string;
  value: number;
  probability: number; // 0-100%
  color: string;
  description: string;
}

/**
 * Calcula projeção com múltiplos cenários
 */
export function calculateEnhancedProjection(
  dailyBalances: number[],
  daysInMonth: number
): EnhancedProjectionPoint[] {
  if (dailyBalances.length === 0) return [];

  const projectionData: EnhancedProjectionPoint[] = [];
  const currentDay = dailyBalances.length;
  const currentBalance = dailyBalances[dailyBalances.length - 1];

  // Calcular tendência (regressão linear simples)
  const n = dailyBalances.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += dailyBalances[i];
    sumXY += i * dailyBalances[i];
    sumXX += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calcular variância para banda de confiança
  const predictions = dailyBalances.map((_, i) => slope * i + intercept);
  const squaredErrors = dailyBalances.map((val, i) => Math.pow(val - predictions[i], 2));
  const variance = squaredErrors.reduce((sum, err) => sum + err, 0) / n;
  const stdDev = Math.sqrt(variance);

  // Adicionar dias reais
  for (let day = 1; day <= currentDay; day++) {
    projectionData.push({
      day,
      real: dailyBalances[day - 1],
    });
  }

  // Projetar dias futuros
  for (let day = currentDay + 1; day <= daysInMonth; day++) {
    const baseProjection = slope * (day - 1) + intercept;
    const daysAhead = day - currentDay;
    
    // Banda de confiança aumenta com a distância
    const confidenceMargin = stdDev * Math.sqrt(daysAhead) * 1.96; // 95% confiança

    // Cenários
    const realistic = baseProjection;
    const optimistic = baseProjection + (Math.abs(slope) * 0.3 * daysAhead); // +30% da tendência
    const pessimistic = baseProjection - (Math.abs(slope) * 0.3 * daysAhead); // -30% da tendência

    projectionData.push({
      day,
      realistic,
      optimistic,
      pessimistic,
      upperBound: realistic + confidenceMargin,
      lowerBound: realistic - confidenceMargin,
    });
  }

  return projectionData;
}

/**
 * Calcula probabilidade de diferentes cenários
 */
function calculateScenarioProbabilities(
  projectionData: EnhancedProjectionPoint[]
): ProjectionScenario[] {
  if (projectionData.length === 0) return [];

  const lastPoint = projectionData[projectionData.length - 1];
  
  if (!lastPoint.realistic || !lastPoint.optimistic || !lastPoint.pessimistic) {
    return [];
  }

  // Distribuição de probabilidade (simplificada - normal)
  return [
    {
      label: 'Cenário Otimista',
      value: lastPoint.optimistic,
      probability: 25,
      color: 'text-green-600 dark:text-green-400',
      description: 'Se economizar mais que o usual',
    },
    {
      label: 'Cenário Realista',
      value: lastPoint.realistic,
      probability: 50,
      color: 'text-blue-600 dark:text-blue-400',
      description: 'Mantendo o padrão atual',
    },
    {
      label: 'Cenário Pessimista',
      value: lastPoint.pessimistic,
      probability: 25,
      color: 'text-red-600 dark:text-red-400',
      description: 'Se gastos aumentarem',
    },
  ];
}

/**
 * Tooltip customizado
 */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || payload.length === 0) return null;

  const real = payload.find((p: any) => p.dataKey === 'real')?.value;
  const realistic = payload.find((p: any) => p.dataKey === 'realistic')?.value;
  const optimistic = payload.find((p: any) => p.dataKey === 'optimistic')?.value;
  const pessimistic = payload.find((p: any) => p.dataKey === 'pessimistic')?.value;

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[220px]">
      <p className="font-semibold text-card-foreground mb-2">Dia {label}</p>
      
      {real !== undefined && (
        <div className="flex justify-between items-center gap-4 mb-1">
          <span className="text-xs text-muted-foreground">Saldo Real:</span>
          <span className="font-bold text-sm text-green-600">{formatCurrency(real)}</span>
        </div>
      )}
      
      {realistic !== undefined && (
        <>
          <div className="border-t border-border my-2" />
          <div className="flex justify-between items-center gap-4 mb-1">
            <span className="text-xs text-blue-600">Realista:</span>
            <span className="font-medium text-sm">{formatCurrency(realistic)}</span>
          </div>
          <div className="flex justify-between items-center gap-4 mb-1">
            <span className="text-xs text-green-600">Otimista:</span>
            <span className="font-medium text-sm">{formatCurrency(optimistic)}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-xs text-red-600">Pessimista:</span>
            <span className="font-medium text-sm">{formatCurrency(pessimistic)}</span>
          </div>
        </>
      )}
    </div>
  );
};

interface EnhancedBalanceProjectionChartProps {
  data: EnhancedProjectionPoint[];
}

export function EnhancedBalanceProjectionChart({ data }: EnhancedBalanceProjectionChartProps) {
  const scenarios = useMemo(() => calculateScenarioProbabilities(data), [data]);

  const metrics = useMemo(() => {
    if (data.length === 0) return null;

    const realData = data.filter(d => d.real !== undefined);
    if (realData.length === 0) return null;

    const currentBalance = realData[realData.length - 1].real!;
    const lastProjection = data[data.length - 1];

    return {
      currentBalance,
      projectedRealistic: lastProjection.realistic || 0,
      projectedOptimistic: lastProjection.optimistic || 0,
      projectedPessimistic: lastProjection.pessimistic || 0,
      daysProjected: data.length - realData.length,
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4 text-center">
        Sem dados suficientes para projeção.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cenários de Projeção */}
      {scenarios.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {scenarios.map((scenario) => (
            <div
              key={scenario.label}
              className="p-3 rounded-lg bg-muted/50 border border-border"
            >
              <div className="text-xs text-muted-foreground mb-1">{scenario.label}</div>
              <div className={`font-bold text-sm ${scenario.color}`}>
                {formatCurrency(scenario.value)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {scenario.probability}% probabilidade
              </div>
              <div className="text-[9px] text-muted-foreground mt-0.5 leading-tight">
                {scenario.description}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Gráfico */}
      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" opacity={0.3} />
            <XAxis
              dataKey="day"
              tick={{ fill: '#888', fontSize: 12 }}
              label={{ value: 'Dia do Mês', position: 'insideBottom', offset: -5, style: { fill: '#888' } }}
            />
            <YAxis
              tick={{ fill: '#888', fontSize: 12 }}
              tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />

            {/* Banda de confiança (área sombreada) */}
            <Area
              type="monotone"
              dataKey="upperBound"
              stroke="none"
              fill="#3b82f6"
              fillOpacity={0.1}
              name="Banda de Confiança"
            />
            <Area
              type="monotone"
              dataKey="lowerBound"
              stroke="none"
              fill="#3b82f6"
              fillOpacity={0.1}
            />

            {/* Linhas de projeção */}
            <Line
              type="monotone"
              dataKey="real"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ fill: '#10b981', r: 3 }}
              name="Real"
            />
            <Line
              type="monotone"
              dataKey="realistic"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Realista"
            />
            <Line
              type="monotone"
              dataKey="optimistic"
              stroke="#22c55e"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
              name="Otimista"
            />
            <Line
              type="monotone"
              dataKey="pessimistic"
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
              name="Pessimista"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Nota explicativa */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
        <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-900 dark:text-blue-300">
          <strong>Como interpretar:</strong> A área sombreada representa a banda de confiança (95%). 
          O cenário <strong>realista</strong> assume que seu padrão de gastos se manterá. 
          Os cenários <strong>otimista</strong> e <strong>pessimista</strong> consideram variações de ±30% na tendência atual.
        </div>
      </div>
    </div>
  );
}
