import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
} from 'recharts';

interface TopExpenseCategoriesChartProps {
  data: Array<{
    category: string;
    amount: number;
    diff: number;
  }>;
}

export function TopExpenseCategoriesChart({ data }: TopExpenseCategoriesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 16, right: 72, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.28} />
        <XAxis
          type="number"
          tickFormatter={(v) => formatCompactCurrencyNumber(v)}
        />
        <YAxis dataKey="category" type="category" width={140} />
        <Tooltip
          formatter={(value: number) =>
            value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          }
          labelFormatter={(label) => label}
        />
        <Bar dataKey="amount" fill="#ef4444" name="Despesas" radius={[4, 4, 4, 4]}>
          <LabelList content={renderAmountAndDiffLabel} />
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

// Label customizada mostrando valor total (compacto) + variação (colorida) sem cortar quando barra é grande
// props: { x, y, width, height, value, index, payload }
const renderAmountAndDiffLabel = (props: any) => {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props || {};
  if (!payload) return null;
  const amount: number = typeof payload.amount === 'number' ? payload.amount : 0;
  const diff: number = typeof payload.diff === 'number' ? payload.diff : 0;
  // Se amount inexistente, não renderiza (evita erro em animações iniciais)
  if (amount === 0 && diff === 0 && !payload.category) return null;
  const compact = formatCompactCurrencyNumber(amount);
  const diffText = diff === 0 ? '' : `${diff > 0 ? '+' : ''}${formatCompactCurrencyNumber(diff)}`;
  const showInside = width > 110; // se barra larga, coloca dentro
  const padding = 6;
  const insideX = x + width - padding;
  const outsideX = x + width + 6;
  const baseY = y + height / 2 + 4; // ajuste visual
  const amountColor = showInside ? '#ffffff' : '#111827';
  const diffColor = diff === 0 ? '#6b7280' : diff > 0 ? '#16a34a' : '#dc2626';
  return (
    <g>
      {/* Valor principal */}
      <text
        x={showInside ? insideX : outsideX}
        y={baseY}
        textAnchor={showInside ? 'end' : 'start'}
        fontSize={12}
        fontWeight={600}
        fill={amountColor}
      >
        {compact}
      </text>
      {diffText && (
        <text
          x={showInside ? insideX : outsideX}
          y={baseY + 12}
          textAnchor={showInside ? 'end' : 'start'}
          fontSize={11}
          fontWeight={500}
          fill={diffColor}
        >
          {diffText}
        </text>
      )}
    </g>
  );
};
