'use client';
import { useState, useMemo } from 'react';
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
import { formatCurrency } from '@/lib/utils';

// Função para determinar cor da carteira pelo nome e tipo
export function getWalletColor(walletName: string, walletType?: string) {
  const name = (walletName || '').toLowerCase().trim();
  const type = (walletType || '').toLowerCase().trim();

  if (type === 'dinheiro') return 'var(--c-22c55e)';
  if (type === 'outros') return 'var(--c-64748b)';

  const looksLikeBank = type === 'banco' || /bank|banco|itau|itaú|nubank|bradesco|santander|caixa|inter|bb|brasil/.test(name);
  if (looksLikeBank) {
    if (name.includes('inter')) return 'var(--c-ff7f00)';
    if (name.includes('nubank')) return 'var(--c-820ad1)';
    if (name.includes('caixa')) return 'var(--c-0c6cb0)';
    if (name.includes('bradesco')) return 'var(--c-d90429)';
    if (name.includes('santander')) return 'var(--c-ec0000)';
    if (name.includes('itau') || name.includes('itaú')) return 'var(--c-ff6600)';
    if (name.includes('bb') || name.includes('brasil')) return 'var(--c-ffcc29)';
    return 'var(--c-3b82f6)';
  }

  if (type === 'vale benefícios' || type === 'vale beneficios' || /alelo|sodexo|vr|flash/.test(name)) {
    if (name.includes('flash')) return 'var(--c-ff0057)';
    if (name.includes('alelo')) return 'var(--c-00995d)';
    if (name.includes('sodexo')) return 'var(--c-e94e1b)';
    if (name.includes('vr')) return 'var(--c-00a859)';
    return 'var(--c-f59e42)';
  }

  return 'var(--c-a3a3a3)';
}

interface DailyWalletChartProps {
  data: Array<{ date: string; [wallet: string]: number | string }>;
  walletsMeta?: Array<{ name: string; type: string }>;
  height?: number | string;
}

// Custom Tooltip
const CustomTooltip = ({ active, payload, label, walletsMeta }: any) => {
  if (!active || !payload || !Array.isArray(payload)) return null;

  const total = payload.reduce((s: number, p: any) => s + (Number(p?.value) || 0), 0);
  if (!total) return null;

  const items = payload
    .map((p: any) => {
      const name = p.name ?? p.dataKey ?? String(p.payload?.name ?? '');
      const value = Number(p.value) || 0;
      const meta = walletsMeta?.find((wm: any) => wm.name === name);
      const color = (meta as any)?.color || p.color || p.fill || getWalletColor(name, (meta as any)?.type);
      return { name, value, color };
    })
    .filter((it: any) => it.value > 0)
    .sort((a: any, b: any) => b.value - a.value);

  if (items.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[220px]">
      <p className="font-semibold text-card-foreground mb-2">
        Dia {String(Number(String(label).split('-').slice(-1)[0]))}
      </p>
      <div className="space-y-2">
        {items.map((it: any) => (
          <div key={it.name} className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <span 
                className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                style={{ backgroundColor: it.color }} 
              />
              <span className="text-sm truncate">{it.name}</span>
            </div>
            <div className="font-mono text-sm font-medium">
              {formatCurrency(it.value)}
              <span className="ml-2 text-xs text-muted-foreground">
                ({Math.round((it.value / total) * 100)}%)
              </span>
            </div>
          </div>
        ))}
        <div className="border-t border-border pt-2 mt-2">
          <div className="flex justify-between items-center gap-4">
            <span className="text-sm font-semibold">Total</span>
            <span className="font-mono text-sm font-bold">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export function DailyWalletChart({ data, walletsMeta, height = 320 }: DailyWalletChartProps) {
  const [hiddenWallets, setHiddenWallets] = useState<Set<string>>(new Set());

  const wallets = useMemo(() => 
    data.length > 0 ? Object.keys(data[0]).filter((k) => k !== 'date') : [], 
    [data]
  );

  // Filtrar dados baseado em carteiras ocultas
  const visibleData = useMemo(() => {
    if (hiddenWallets.size === 0) return data;
    return data.map(item => {
      const filtered: any = { date: item.date };
      wallets.forEach(wallet => {
        if (!hiddenWallets.has(wallet)) {
          filtered[wallet] = item[wallet];
        }
      });
      return filtered;
    });
  }, [data, wallets, hiddenWallets]);

  // Calcular totalizadores
  const metrics = useMemo(() => {
    const totals: Record<string, number> = {};
    let grandTotal = 0;
    
    wallets.forEach(wallet => {
      totals[wallet] = data.reduce((sum, item) => {
        const val = Number(item[wallet]) || 0;
        return sum + val;
      }, 0);
      grandTotal += totals[wallet];
    });

    const maxDay = data.reduce((max, item) => {
      const dayTotal = wallets.reduce((sum, wallet) => sum + (Number(item[wallet]) || 0), 0);
      return Math.max(max, dayTotal);
    }, 0);

    const avgPerDay = data.length > 0 ? grandTotal / data.length : 0;

    return { totals, grandTotal, maxDay, avgPerDay, walletsCount: wallets.length };
  }, [data, wallets]);

  // Toggle carteira
  const toggleWallet = (wallet: string) => {
    setHiddenWallets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(wallet)) {
        newSet.delete(wallet);
      } else {
        newSet.add(wallet);
      }
      return newSet;
    });
  };

  return (
    <div className="w-full">
      {/* Totalizadores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 p-4 bg-muted/50 rounded-lg">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Total</p>
          <p className="font-bold text-sm md:text-base">{formatCurrency(metrics.grandTotal)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Carteiras</p>
          <p className="font-bold text-sm md:text-base">{metrics.walletsCount}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Maior Dia</p>
          <p className="font-bold text-sm md:text-base">{formatCurrency(metrics.maxDay)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Média/Dia</p>
          <p className="font-bold text-sm md:text-base">{formatCurrency(metrics.avgPerDay)}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height as any}>
        <BarChart data={visibleData} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.28} />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickFormatter={(d) => String(Number(d.split('-')[2]))} 
          />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
          <Tooltip content={<CustomTooltip walletsMeta={walletsMeta} />} />
          <Legend 
            formatter={(value) => value}
            onClick={(e) => toggleWallet(e.value)}
            wrapperStyle={{ cursor: 'pointer', fontSize: '13px' }}
            iconType="circle"
          />
          {wallets.map((w) => {
            const meta = walletsMeta?.find((wm) => wm.name === w);
            const walletType = meta?.type;
            return (
              <Bar 
                key={w} 
                dataKey={w} 
                stackId="a" 
                fill={getWalletColor(w, walletType)} 
                name={w}
                opacity={hiddenWallets.has(w) ? 0.3 : 1}
                style={{ 
                  cursor: 'pointer',
                  transition: 'opacity 0.3s ease'
                }}
                animationDuration={800}
              />
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
