import html2canvas from 'html2canvas';

/**
 * Exporta dados para CSV
 */
export function exportToCSV(data: any[], filename: string = 'dados.csv') {
  if (data.length === 0) return;

  // Pega as colunas do primeiro objeto
  const headers = Object.keys(data[0]);
  
  // Cria o CSV
  const csvRows = [];
  
  // Adiciona cabeçalho
  csvRows.push(headers.join(','));
  
  // Adiciona dados
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Escapa vírgulas e aspas
      const escaped = String(value).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  
  // Cria blob e faz download
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exporta elemento DOM como PNG
 */
export async function exportToPNG(elementId: string, filename: string = 'grafico.png') {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Elemento não encontrado:', elementId);
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2, // Melhor qualidade
      logging: false,
      useCORS: true,
    });

    // Converte para blob
    canvas.toBlob((blob: Blob | null) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      }
    });
  } catch (error) {
    console.error('Erro ao exportar PNG:', error);
  }
}

/**
 * Formata dados de gráfico de pizza para CSV
 */
export function formatPieChartDataForCSV(data: Array<{ name: string; value: number }>) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  return data.map(item => ({
    Categoria: item.name,
    Valor: item.value,
    Percentual: `${((item.value / total) * 100).toFixed(2)}%`,
  }));
}

/**
 * Formata dados de gráfico de barras empilhadas para CSV
 */
export function formatStackedBarChartDataForCSV(
  data: Array<{ date: string; [key: string]: number | string }>,
  columns: string[]
) {
  return data.map(row => {
    const formatted: any = { Data: row.date };
    columns.forEach(col => {
      formatted[col] = row[col] || 0;
    });
    return formatted;
  });
}

/**
 * Formata dados de gráfico de linha para CSV
 */
export function formatLineChartDataForCSV(data: Array<{ date: string; balance: number }>) {
  return data.map(item => ({
    Data: item.date,
    Saldo: item.balance,
  }));
}

/**
 * Formata dados de gráfico de projeção para CSV
 */
export function formatProjectionChartDataForCSV(
  data: Array<{ 
    day: number; 
    real?: number; 
    baselineLinear?: number; 
    baselineRecent?: number;
  }>
) {
  return data.map(item => ({
    Dia: item.day,
    'Saldo Real': item.real ?? '',
    'Projeção Linear': item.baselineLinear ?? '',
    'Projeção Recente': item.baselineRecent ?? '',
  }));
}

/**
 * Formata dados de gráfico mensal para CSV
 */
export function formatMonthlyChartDataForCSV(
  data: Array<{ month: string; income: number; expense: number; balance: number }>
) {
  return data.map(item => ({
    Mês: item.month,
    Receitas: item.income,
    Despesas: item.expense,
    Saldo: item.balance,
    'Taxa de Economia': item.income > 0 ? `${(((item.income - item.expense) / item.income) * 100).toFixed(1)}%` : '0%',
  }));
}

/**
 * Formata dados de categorias top para CSV
 */
export function formatTopCategoriesDataForCSV(
  data: Array<{
    category: string;
    amount: number;
    prevAmount?: number;
    diff: number;
  }>
) {
  return data.map(item => ({
    Categoria: item.category,
    'Valor Atual': item.amount,
    'Valor Anterior': item.prevAmount ?? (item.amount - item.diff),
    Variação: item.diff,
    'Variação %': item.prevAmount 
      ? `${((item.diff / Math.abs(item.prevAmount)) * 100).toFixed(1)}%`
      : '0%',
  }));
}
