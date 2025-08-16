import { useEffect, useState } from 'react';

export interface DailyCategoryData {
	date: string; // yyyy-MM-dd
	[category: string]: number | string;
}

export interface DailyWalletData {
	date: string;
	[wallet: string]: number | string;
}

interface UseDailyExpenseDataOptions {
	year: number;
	month: number; // 1-12
	walletId?: string;
}

// Retorna dados diários agregados por categoria e por carteira para o mês selecionado
export function useDailyExpenseData({ year, month, walletId }: UseDailyExpenseDataOptions) {
	const [byCategory, setByCategory] = useState<DailyCategoryData[]>([]);
	const [byWallet, setByWallet] = useState<DailyWalletData[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		async function fetchData() {
			setLoading(true);
			// Calcular início e fim do mês
			const start = new Date(year, month - 1, 1);
			const end = new Date(year, month, 0);
			const toYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
			const startStr = toYmd(start);
			const endStr = toYmd(end);
			const walletParam = walletId ? `&walletId=${walletId}` : '';
			// Buscar despesas variáveis e fixas do período
			const [expVarRes, expFixRes] = await Promise.all([
				fetch(`/api/expenses?type=VARIABLE&start=${startStr}&end=${endStr}${walletParam}`),
				fetch(`/api/expenses?type=FIXED&start=${startStr}&end=${endStr}${walletParam}`),
			]);
			const [expVar, expFix] = await Promise.all([
				expVarRes.ok ? expVarRes.json() : [],
				expFixRes.ok ? expFixRes.json() : [],
			]);
			const allExpenses = [...expVar, ...expFix];

			// Mapear todas as datas do mês
			const days: string[] = [];
			for (let d = 1; d <= end.getDate(); d++) {
				days.push(toYmd(new Date(year, month - 1, d)));
			}

			// Agregar por categoria
			const categories = Array.from(new Set(allExpenses.map(e => e.category?.name || 'Sem categoria')));
			const dailyByCategory: DailyCategoryData[] = days.map(date => {
				const row: DailyCategoryData = { date };
				for (const cat of categories) {
					row[cat] = 0;
				}
				allExpenses.filter(e => toYmd(new Date(e.date)) === date).forEach(e => {
					const cat = e.category?.name || 'Sem categoria';
					row[cat] = (row[cat] as number) + Number(e.amount);
				});
				return row;
			});

			// Agregar por carteira
			const wallets = Array.from(new Set(allExpenses.map(e => e.wallet?.name || 'Sem carteira')));
			const dailyByWallet: DailyWalletData[] = days.map(date => {
				const row: DailyWalletData = { date };
				for (const w of wallets) {
					row[w] = 0;
				}
				allExpenses.filter(e => toYmd(new Date(e.date)) === date).forEach(e => {
					const w = e.wallet?.name || 'Sem carteira';
					row[w] = (row[w] as number) + Number(e.amount);
				});
				return row;
			});

			setByCategory(dailyByCategory);
			setByWallet(dailyByWallet);
			setLoading(false);
		}
		fetchData();
	}, [year, month, walletId]);

	return { byCategory, byWallet, loading };
}
