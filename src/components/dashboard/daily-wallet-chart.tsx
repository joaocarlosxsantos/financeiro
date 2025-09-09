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

// Função para determinar cor da carteira pelo nome e tipo
export function getWalletColor(walletName: string, walletType?: string) {
  // Normalizar inputs para comparações tolerantes a case/espacos
  const name = (walletName || '').toLowerCase().trim();
  const type = (walletType || '').toLowerCase().trim();

  // Preferir tipo quando disponível
  if (type === 'dinheiro') return 'var(--c-22c55e)'; // verde
  if (type === 'outros') return 'var(--c-64748b)'; // cinza

  // Se for banco (ou se o tipo não estiver presente mas o nome sugira banco), escolher cores por heurística
  const looksLikeBank = type === 'banco' || /bank|banco|itau|itaú|nubank|bradesco|santander|caixa|inter|bb|brasil/.test(name);
  if (looksLikeBank) {
  if (name.includes('inter')) return 'var(--c-ff7f00)'; // laranja Inter
  if (name.includes('nubank')) return 'var(--c-820ad1)'; // roxo Nubank
  if (name.includes('caixa')) return 'var(--c-0c6cb0)'; // azul Caixa
  if (name.includes('bradesco')) return 'var(--c-d90429)'; // vermelho Bradesco
  if (name.includes('santander')) return 'var(--c-ec0000)'; // vermelho Santander
  if (name.includes('itau') || name.includes('itaú')) return 'var(--c-ff6600)'; // laranja Itaú
  if (name.includes('bb') || name.includes('brasil')) return 'var(--c-ffcc29)'; // amarelo BB
    // padrão para bancos
  return 'var(--c-3b82f6)'; // azul padrão banco
  }

  // Vale benefícios
  if (type === 'vale benefícios' || type === 'vale beneficios' || /alelo|sodexo|vr|flash/.test(name)) {
  if (name.includes('flash')) return 'var(--c-ff0057)'; // cor Flash
  if (name.includes('alelo')) return 'var(--c-00995d)'; // verde Alelo
  if (name.includes('sodexo')) return 'var(--c-e94e1b)'; // laranja Sodexo
  if (name.includes('vr')) return 'var(--c-00a859)'; // verde VR
  return 'var(--c-f59e42)'; // laranja padrão benefício
  }

  return 'var(--c-a3a3a3)'; // fallback cinza
}

interface DailyWalletChartProps {
  data: Array<{ date: string; [wallet: string]: number | string }>;
  walletsMeta?: Array<{ name: string; type: string }>;
  height?: number | string;
}

export function DailyWalletChart({ data, walletsMeta, height = 320 }: DailyWalletChartProps) {
  // Extrai as carteiras dinamicamente (exceto a coluna 'date')
  const wallets = data.length > 0 ? Object.keys(data[0]).filter((k) => k !== 'date') : [];
  const DayBreakdownTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !Array.isArray(payload)) return null;
    const total = payload.reduce((s: number, p: any) => s + (Number(p?.value) || 0), 0);
    if (!total) return null;
    const items = payload
      .map((p: any) => {
        const name = p.name ?? p.dataKey ?? String(p.payload?.name ?? '');
        const value = Number(p.value) || 0;
  const meta = walletsMeta?.find((wm) => wm.name === name);
  const color = (meta as any)?.color || p.color || p.fill || getWalletColor(name, (meta as any)?.type);
        return { name, value, color };
      })
      .filter((it: any) => it.value > 0)
      .sort((a: any, b: any) => b.value - a.value);
    if (items.length === 0) return null;
    return (
      <div style={{ background: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', padding: 10, borderRadius: 8, boxShadow: '0 6px 18px rgba(2,6,23,0.08)', minWidth: 220 }}>
        <div style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', marginBottom: 8 }}>Dia {String(Number(String(label).split('-').slice(-1)[0]))}</div>
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
        {wallets.map((w) => {
          const meta = walletsMeta?.find((wm) => wm.name === w);
          const walletType = meta?.type;
          return (
            <Bar key={w} dataKey={w} stackId="a" fill={getWalletColor(w, walletType)} name={w} />
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}
