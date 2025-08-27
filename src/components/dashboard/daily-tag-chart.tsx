import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

interface DailyTagChartProps {
  data: Array<{ date: string; [tag: string]: number | string }>;
  tagNames?: Record<string,string>;
}

export function DailyTagChart({ data, tagNames }: DailyTagChartProps) {
  const tags = data.length > 0 ? Object.keys(data[0]).filter((k) => k !== 'date') : [];
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tickFormatter={(d) => String(Number(d.split('-')[2]))} />
        <YAxis />
        <Tooltip
          formatter={(value: number) =>
            value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          }
          labelFormatter={(label) => `Dia ${String(Number(label.split('-')[2]))}`}
        />
        <Legend formatter={(value) => value} />
        {tags.map((tag, idx) => {
          const display = tagNames?.[tag] || tag;
          return <Bar key={tag} dataKey={tag} stackId="a" fill={getColor(idx)} name={display} />;
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}

function getColor(idx: number) {
  const palette = [
    '#6366f1',
    '#10b981',
    '#ef4444',
    '#f59e42',
    '#3b82f6',
    '#a21caf',
    '#eab308',
    '#0ea5e9',
    '#f43f5e',
    '#22d3ee',
    '#84cc16',
    '#f472b6',
  ];
  return palette[idx % palette.length];
}

export default DailyTagChart;
