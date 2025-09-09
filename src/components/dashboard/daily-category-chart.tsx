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

interface DailyCategoryChartProps {
  data: Array<{ date: string; [category: string]: number | string }>;
  categoryColors?: Record<string, string>;
  height?: number | string;
}

export function DailyCategoryChart({ data, categoryColors, height = 320 }: DailyCategoryChartProps) {
  // Extrai as categorias dinamicamente (exceto a coluna 'date')
  const categories = data.length > 0 ? Object.keys(data[0]).filter((k) => k !== 'date') : [];
  const DayBreakdownTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !Array.isArray(payload)) return null;
    // Somatório total — se 0, não mostrar tooltip
    const total = payload.reduce((s: number, p: any) => s + (Number(p?.value) || 0), 0);
    if (!total) return null;

    const items = payload
      .map((p: any) => {
        const name = p.name ?? p.dataKey ?? String(p.payload?.name ?? '');
        const value = Number(p.value) || 0;
        // cor: prioridade -> categoryColors prop, payload.color / fill, fallback por índice
        const color = (categoryColors && categoryColors[name]) || p.color || p.fill || getColor(Math.max(0, categories.indexOf(name)));
        return { name, value, color };
      })
      .filter((it: any) => it.value > 0)
      .sort((a: any, b: any) => b.value - a.value);

    if (items.length === 0) return null;

    return (
      <div style={{ background: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', padding: 10, borderRadius: 8, boxShadow: '0 6px 18px rgba(2,6,23,0.08)', minWidth: 220 }}>
        <div style={{ fontSize: 15, color: 'hsl(var(--muted-foreground))', marginBottom: 8 }}>Dia {String(Number(String(label).split('-').slice(-1)[0]))}</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((it: any) => (
            <div key={it.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, fontSize: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span aria-hidden style={{ width: 10, height: 10, borderRadius: 9999, background: it.color }} />
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
              </div>
              <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace', fontSize: 20 }}>{it.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  return (
    <ResponsiveContainer width="100%" height={height as any}>
      <BarChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.28} />
        <XAxis dataKey="date" tickFormatter={(d) => String(Number(d.split('-')[2]))} />
        <YAxis />
        <Tooltip content={<DayBreakdownTooltip />} />
  <Legend formatter={(value)=> value} />
        {categories.map((cat, idx) => (
          <Bar
            key={cat}
            dataKey={cat}
            stackId="a"
            fill={categoryColors?.[cat] || getColor(idx)}
            name={cat}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// Função simples para gerar cores distintas
function getColor(idx: number) {
  const palette = [
    'hsl(var(--primary))',
    'hsl(var(--success))',
    'hsl(var(--danger))',
    'hsl(34 95% 60%)',
    'hsl(214 90% 56%)',
    'hsl(286 60% 47%)',
    'hsl(48 85% 50%)',
    'hsl(197 90% 56%)',
    'hsl(344 85% 58%)',
    'hsl(187 85% 50%)',
    'hsl(88 65% 45%)',
    'hsl(326 70% 62%)',
  ];
  return palette[idx % palette.length];
}
