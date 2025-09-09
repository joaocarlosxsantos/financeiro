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
function getWalletColor(walletName: string, walletType?: string) {
  // Normalizar inputs para comparações tolerantes a case/espacos
  const name = (walletName || '').toLowerCase().trim();
  const type = (walletType || '').toLowerCase().trim();

  // Preferir tipo quando disponível
  if (type === 'dinheiro') return '#22c55e'; // verde
  if (type === 'outros') return '#64748b'; // cinza

  // Se for banco (ou se o tipo não estiver presente mas o nome sugira banco), escolher cores por heurística
  const looksLikeBank = type === 'banco' || /bank|banco|itau|itaú|nubank|bradesco|santander|caixa|inter|bb|brasil/.test(name);
  if (looksLikeBank) {
    if (name.includes('inter')) return '#ff7f00'; // laranja Inter
    if (name.includes('nubank')) return '#820ad1'; // roxo Nubank
    if (name.includes('caixa')) return '#0c6cb0'; // azul Caixa
    if (name.includes('bradesco')) return '#d90429'; // vermelho Bradesco
    if (name.includes('santander')) return '#ec0000'; // vermelho Santander
    if (name.includes('itau') || name.includes('itaú')) return '#ff6600'; // laranja Itaú
    if (name.includes('bb') || name.includes('brasil')) return '#ffcc29'; // amarelo BB
    // padrão para bancos
    return '#3b82f6'; // azul padrão banco
  }

  // Vale benefícios
  if (type === 'vale benefícios' || type === 'vale beneficios' || /alelo|sodexo|vr|flash/.test(name)) {
    if (name.includes('flash')) return '#ff0057'; // cor Flash
    if (name.includes('alelo')) return '#00995d'; // verde Alelo
    if (name.includes('sodexo')) return '#e94e1b'; // laranja Sodexo
    if (name.includes('vr')) return '#00a859'; // verde VR
    return '#f59e42'; // laranja padrão benefício
  }

  return '#a3a3a3'; // fallback cinza
}

interface DailyWalletChartProps {
  data: Array<{ date: string; [wallet: string]: number | string }>;
  walletsMeta?: Array<{ name: string; type: string }>;
}

export function DailyWalletChart({ data, walletsMeta }: DailyWalletChartProps) {
  // Extrai as carteiras dinamicamente (exceto a coluna 'date')
  const wallets = data.length > 0 ? Object.keys(data[0]).filter((k) => k !== 'date') : [];
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.28} />
        <XAxis dataKey="date" tickFormatter={(d) => String(Number(d.split('-')[2]))} />
        <YAxis />
        <Tooltip
          formatter={(value: number) =>
            value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          }
          labelFormatter={(label) => `Dia ${String(Number(label.split('-')[2]))}`}
        />
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
