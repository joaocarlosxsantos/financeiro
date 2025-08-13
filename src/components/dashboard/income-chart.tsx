'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface IncomeChartProps {
  data: Array<{
    category: string
    amount: number
    color: string
  }>
}

export function IncomeChart({ data }: IncomeChartProps) {
  const total = data.reduce((sum, item) => sum + item.amount, 0)

  const chartData = data.map(item => ({
    name: item.category,
    value: item.amount,
    color: item.color,
    percentage: ((item.amount / total) * 100).toFixed(1)
  }))

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percentage }) => `${name} (${percentage}%)`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => [formatCurrency(value), 'Valor']}
            labelFormatter={(label) => `Categoria: ${label}`}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      
      <div className="mt-4 space-y-2">
        {chartData.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span>{item.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-medium">{formatCurrency(item.value)}</span>
              <span className="text-gray-500">({item.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
