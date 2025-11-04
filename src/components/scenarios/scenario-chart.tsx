'use client';

import React from 'react';
import { ScenarioResult } from '@/lib/scenario-simulator';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ScenarioChartProps {
  results: ScenarioResult[];
  dataKey: 'balance' | 'income' | 'expenses' | 'invested';
}

export function ScenarioChart({ results, dataKey }: ScenarioChartProps) {
  if (results.length === 0) return null;

  // Prepara os dados para o gráfico
  const maxMonths = Math.max(...results.map(r => r.monthlyData.length));
  const chartData = Array.from({ length: maxMonths }, (_, i) => {
    const dataPoint: any = { month: i + 1 };
    
    results.forEach(result => {
      if (result.monthlyData[i]) {
        dataPoint[result.id] = Number(result.monthlyData[i][dataKey]);
      }
    });
    
    return dataPoint;
  });

  const labels: Record<string, string> = {
    balance: 'Saldo',
    income: 'Renda',
    expenses: 'Despesas',
    invested: 'Investido',
  };

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="month" 
            label={{ value: 'Mês', position: 'insideBottom', offset: -5 }}
            className="text-xs"
          />
          <YAxis 
            label={{ value: labels[dataKey], angle: -90, position: 'insideLeft' }}
            className="text-xs"
            tickFormatter={(value) => 
              `R$ ${(value / 1000).toFixed(0)}k`
            }
          />
          <Tooltip
            formatter={(value: number) =>
              `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            }
            labelFormatter={(label) => `Mês ${label}`}
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
            }}
          />
          <Legend />
          
          {results.map(result => (
            <Line
              key={result.id}
              type="monotone"
              dataKey={result.id}
              name={result.name}
              stroke={result.color}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
