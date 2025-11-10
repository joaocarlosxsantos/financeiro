import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * API para processar arquivos CSV de fatura de cartão de crédito
 * POST /api/importar-fatura/parse
 * 
 * Recebe um arquivo CSV e retorna as transações parseadas
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não fornecido' }, { status: 400 });
    }

    // Verificar se é CSV
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv')) {
      return NextResponse.json({ error: 'Apenas arquivos CSV são aceitos' }, { status: 400 });
    }

    // Ler conteúdo do arquivo
    const text = await file.text();
    
    // Processar CSV
    const transactions = parseCSV(text);

    if (transactions.length === 0) {
      return NextResponse.json({ error: 'Nenhuma transação encontrada no arquivo' }, { status: 400 });
    }

    // Sugerir categorias usando IA (similar ao extrato)
    const transactionsWithCategories = await suggestCategories(transactions);

    return NextResponse.json({
      success: true,
      transactions: transactionsWithCategories,
      count: transactionsWithCategories.length
    });

  } catch (error: any) {
    console.error('Erro ao processar fatura:', error);
    return NextResponse.json(
      { error: 'Erro ao processar arquivo', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Parse do CSV da fatura
 * Formato esperado: Data, Lançamento, Categoria, Tipo, Valor
 */
function parseCSV(text: string): any[] {
  const lines = text.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('Arquivo CSV vazio ou inválido');
  }

  // Remover header
  const header = lines[0];
  const dataLines = lines.slice(1);

  const transactions: any[] = [];

  for (const line of dataLines) {
    // Parse CSV considerando valores entre aspas
    const values = parseCSVLine(line);
    
    if (values.length < 5) continue; // Linha inválida

    const [data, descricao, categoriaOriginal, tipo, valorStr] = values;

    // Parse da data (formato DD/MM/YYYY)
    const dateParts = data.split('/');
    if (dateParts.length !== 3) continue;

    const [day, month, year] = dateParts;
    const dateISO = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    // Parse do valor (formato R$ 1.234,56 ou -R$ 1.234,56)
    let valor = parseValor(valorStr);

    // Detectar se é crédito (pagamento) ou débito (compra)
    // Valores negativos são pagamentos/créditos
    const isCredito = valor < 0;
    valor = Math.abs(valor);

    transactions.push({
      data: dateISO,
      descricao: descricao.trim(),
      valor,
      tipo: isCredito ? 'credito' : 'debito',
      categoriaOriginal: categoriaOriginal?.trim() || 'OUTROS',
      tipoOriginal: tipo?.trim() || '',
      // Campos para o preview
      categoriaSugerida: '', // Será preenchido pela IA
      incluir: true
    });
  }

  return transactions;
}

/**
 * Parse de uma linha CSV considerando aspas
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

/**
 * Parse do valor monetário
 * Formatos aceitos: R$ 1.234,56 | -R$ 1.234,56 | 1.234,56 | -1.234,56
 */
function parseValor(valorStr: string): number {
  // Remover "R$" e espaços
  let cleanStr = valorStr.replace(/R\$\s*/g, '').trim();
  
  // Detectar sinal negativo
  const isNegative = cleanStr.startsWith('-');
  cleanStr = cleanStr.replace('-', '');

  // Remover pontos de milhar e substituir vírgula por ponto
  cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');

  const valor = parseFloat(cleanStr) || 0;
  return isNegative ? -valor : valor;
}

/**
 * Sugerir categorias usando IA
 */
async function suggestCategories(transactions: any[]): Promise<any[]> {
  try {
    // Usar a mesma API de categorização que o extrato
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/ai/categorize-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactions: transactions.map(t => ({
          descricao: t.descricao,
          valor: t.valor,
          tipo: t.tipo
        }))
      })
    });

    if (!response.ok) {
      console.warn('Erro ao sugerir categorias, continuando sem sugestões');
      return transactions;
    }

    const { suggestions } = await response.json();

    return transactions.map((t, index) => ({
      ...t,
      categoriaSugerida: suggestions[index]?.categoria || ''
    }));

  } catch (error) {
    console.warn('Erro ao sugerir categorias:', error);
    return transactions;
  }
}
