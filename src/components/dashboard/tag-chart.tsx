'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface TagChartProps {
  data: Array<{
    tag: string
    amount: number
    color: string
  }>
}

export function TagChart({ data }: TagChartProps) {
  const total = data.reduce((sum, item) => sum + item.amount, 0)

  const chartData = data.map(item => ({
    name: item.tag,
    value: item.amount,
    color: item.color,
    percentage: ((item.amount / total) * 100).toFixed(1)
  }))

  return (
    <div className="w-full">
      <div className="h-72 md:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              label={false}
              labelLine={false}
              outerRadius={90}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [formatCurrency(value), 'Valor']}
              labelFormatter={(label) => `Tag: ${label}`}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 space-y-2 w-full min-w-0 max-w-full">
        {chartData.map((item, index) => (
          <div key={index} className="flex w-full flex-col sm:flex-row sm:justify-between text-sm gap-2 min-w-0 items-start">
            <div className="flex items-start space-x-2 min-w-0">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: item.color }}
              />
              <span className="whitespace-normal break-words">{item.name}</span>
            </div>
            <span className="text-gray-500 dark:text-foreground">{formatCurrency(item.value)} ({item.percentage}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}
