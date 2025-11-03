'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { formatCurrency } from '@/lib/utils';
import { useState } from 'react';
import { ChartExportButtons } from './chart-export-buttons';
import { ChartTableView } from './chart-table-view';
import { exportToCSV, exportToPNG, formatPieChartDataForCSV } from '@/lib/chart-export-utils';

interface IncomeChartProps {
  data: Array<{
    category: string;
    amount: number;
    color: string;
  }>;
  maxItems?: number;
}

// Custom Tooltip Component
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload[0]) return null;
  
  const data = payload[0].payload;
  const { name, value, percentage, color } = data;

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-4 min-w-[220px]">
      <div className="flex items-center gap-2 mb-3">
        <div 
          className="w-4 h-4 rounded-full flex-shrink-0" 
          style={{ backgroundColor: color }}
        />
        <p className="font-semibold text-card-foreground text-base">{name}</p>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Valor:</span>
          <span className="font-bold text-lg">{formatCurrency(value)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Percentual:</span>
          <span className="font-semibold text-primary">{percentage}%</span>
        </div>
      </div>
    </div>
  );
};

export function IncomeChart({ data, maxItems }: IncomeChartProps) {
  const isMobile = useIsMobile();
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());
  const [showTable, setShowTable] = useState(false);
  
  const total = data.reduce((sum, item) => sum + item.amount, 0);
  const count = data.length;
  const average = count > 0 ? total / count : 0;

  let chartData = data
    .map((item) => ({
      name: item.category,
      value: item.amount,
      color: item.color,
      percentage: ((item.amount / total) * 100).toFixed(1),
    }))
    .sort((a, b) => b.value - a.value);
    
  if (maxItems && chartData.length > maxItems) {
    chartData = chartData.slice(0, maxItems);
  }

  // Filtrar categorias ocultas
  const visibleData = chartData.filter(item => !hiddenCategories.has(item.name));
  const visibleTotal = visibleData.reduce((sum, item) => sum + item.value, 0);

  const toggleCategory = (category: string) => {
    const newHidden = new Set(hiddenCategories);
    if (newHidden.has(category)) {
      newHidden.delete(category);
    } else {
      newHidden.add(category);
    }
    setHiddenCategories(newHidden);
  };

  // Funções de export
  const handleExportCSV = () => {
    const csvData = formatPieChartDataForCSV(
      chartData.map(item => ({ name: item.name, value: item.value }))
    );
    exportToCSV(csvData, 'receitas-por-categoria.csv');
  };

  const handleExportPNG = async () => {
    await exportToPNG('income-chart-container', 'receitas-por-categoria.png');
  };

  const handleToggleTable = () => {
    setShowTable(!showTable);
  };

  return (
    <div className="w-full">
      {/* Botões de Export */}
      <div className="flex justify-end mb-4">
        <ChartExportButtons
          onExportCSV={handleExportCSV}
          onExportPNG={handleExportPNG}
          onToggleTable={handleToggleTable}
          showingTable={showTable}
          chartTitle="Receitas por Categoria"
        />
      </div>

      {showTable ? (
        <ChartTableView
          data={chartData.map(item => ({ name: item.name, value: item.value }))}
          title="Receitas por Categoria"
          showPercentage={true}
        />
      ) : (
        <div id="income-chart-container">
          {/* Totalizadores */}
          <div className="grid grid-cols-3 gap-3 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Total</p>
              <p className="font-bold text-lg text-success">{formatCurrency(visibleTotal)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Categorias</p>
              <p className="font-bold text-lg">{visibleData.length}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Média</p>
              <p className="font-bold text-lg">{formatCurrency(average)}</p>
            </div>
          </div>

          <div className="h-72 md:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={visibleData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={isMobile ? 100 : 150}
                  fill="hsl(var(--muted))"
                  dataKey="value"
                  animationDuration={800}
                >
                  {visibleData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color || 'hsl(var(--success))'} 
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  onClick={(e: any) => toggleCategory(e.value)}
                  wrapperStyle={{ cursor: 'pointer' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 space-y-2 w-full min-w-0 max-w-full">
            {chartData.map((item, index) => {
              const isHidden = hiddenCategories.has(item.name);
              return (
                <div
                  key={index}
                  onClick={() => toggleCategory(item.name)}
                  className={`flex w-full flex-col sm:flex-row sm:justify-between text-sm gap-2 min-w-0 items-start p-2 rounded hover:bg-muted/50 cursor-pointer transition-all ${
                    isHidden ? 'opacity-40' : 'opacity-100'
                  }`}
                >
                  <div className="flex items-start space-x-2 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                      style={{ backgroundColor: item.color || 'hsl(var(--success))' }}
                    />
                    <span className={`whitespace-normal break-words ${isHidden ? 'line-through' : ''}`}>
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className="font-medium">{formatCurrency(item.value)}</span>
                    <span className="text-muted-foreground">({item.percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
