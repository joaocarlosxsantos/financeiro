import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
  Cell,
  ReferenceLine,
} from 'recharts';

interface TopExpenseCategoriesChartProps {
  data: Array<{
    category: string;
    amount: number;      // valor atual
    prevAmount?: number; // valor mês anterior
    diff: number;        // amount - prevAmount
  }>;
}

export function TopExpenseCategoriesChart({ data }: TopExpenseCategoriesChartProps) {
  // Ajusta domínio simétrico baseado no maior |diff|
  const maxAbs = Math.max(0, ...data.map((d) => Math.abs(d.diff)));
  const domain = maxAbs === 0 ? [0, 0] : [-maxAbs, maxAbs];
  const chartData = data.map((d) => ({
    category: d.category,
    diff: d.diff, // usamos diff diretamente
    amount: d.amount,
    prevAmount: d.prevAmount ?? (d.amount - d.diff),
  }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 16, right: 72, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.28} />
        <XAxis
          type="number"
          domain={domain as [number, number]}
          tickFormatter={(v) => formatCompactCurrencyNumber(v)}
        />
        <YAxis
          dataKey="category"
          type="category"
            width={170}
          tick={{
            fill: 'hsl(var(--foreground))',
            fontSize: 14,
            fontWeight: 600,
          }}
        />
        <ReferenceLine x={0} stroke="#64748b" strokeDasharray="4 3" />
        <Tooltip
          formatter={(value: any, name: any) => {
            if (typeof value === 'number') {
              if (name === 'diff') {
                return [formatFullCurrency(value), value > 0 ? 'Aumento' : 'Redução'];
              }
              return [formatFullCurrency(value), name];
            }
            return [value, name];
          }}
          labelFormatter={(label: any) => label}
        />
        <Bar
          dataKey="diff"
          name="Variação"
          radius={[4, 4, 4, 4]}
          barSize={20}
          isAnimationActive={false}
        >
          {chartData.map((d) => (
            <Cell key={d.category} fill={d.diff > 0 ? '#dc2626' : '#16a34a'} />
          ))}
          <LabelList content={renderDiffLabel} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Formata valores em uma forma compacta: 1.2K, 3.4M, etc, mantendo prefixo R$
function formatCompactCurrencyNumber(v: number): string {
  if (v === 0) return '0';
  const abs = Math.abs(v);
  let suffix = '';
  let scaled = v;
  if (abs >= 1_000_000_000) {
    scaled = v / 1_000_000_000;
    suffix = 'B';
  } else if (abs >= 1_000_000) {
    scaled = v / 1_000_000;
    suffix = 'M';
  } else if (abs >= 1_000) {
    scaled = v / 1_000;
    suffix = 'K';
  }
  return `${scaled.toFixed(scaled >= 100 || suffix === '' ? 0 : 1)}${suffix}`;
}

function formatFullCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Label custom para exibir diff compacto + valor anterior/atual
const renderDiffLabel = (props: any) => {
  const { x = 0, y = 0, width = 0, height = 0, value, payload } = props || {};
  if (typeof value !== 'number' || !payload) return null;
  const diff = value;
  const prevAmount: number = payload.prevAmount ?? payload.amount - diff;
  const currentAmount: number = payload.amount;
  const diffCompact = `${diff > 0 ? '+' : ''}${formatCompactCurrencyNumber(diff)}`;
  const color = diff > 0 ? '#dc2626' : '#16a34a';
  const centerY = y + height / 2 + 4;
  const anchor = diff >= 0 ? 'start' : 'end';
  const textX = diff >= 0 ? x + width + 6 : x - 6;
  return (
    <g>
      <text
        x={textX}
        y={centerY}
        fontSize={12}
        fontWeight={600}
        textAnchor={anchor}
        fill={color}
      >
        {diffCompact}
      </text>
      <text
        x={textX}
        y={centerY + 12}
        fontSize={10}
        fontWeight={500}
        textAnchor={anchor}
        fill="#6b7280"
      >
        {`${formatCompactCurrencyNumber(prevAmount)} → ${formatCompactCurrencyNumber(currentAmount)}`}
      </text>
    </g>
  );
};

