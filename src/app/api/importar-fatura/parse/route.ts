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

    // Sugerir categorias usando regras simples
    const transactionsWithCategories = suggestCategories(transactions);

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
 * Sugerir categorias usando regras simples
 */
function suggestCategories(transactions: any[]): any[] {
  return transactions.map(t => ({
    ...t,
    categoriaSugerida: sugerirCategoria(t.descricao)
  }));
}

/**
 * Função simples de sugestão de categoria baseada em palavras-chave
 */
function sugerirCategoria(descricao: string): string {
  if (!descricao) return 'Outros';
  const desc = descricao.toLowerCase();
  
  // Alimentação
  if (desc.includes('ifood') || desc.includes('rappi') || desc.includes('uber eats')) return 'Alimentação';
  if (desc.includes('restaurante') || desc.includes('lanchonete') || desc.includes('pizzaria')) return 'Alimentação';
  if (desc.includes('bar') || desc.includes('café') || desc.includes('padaria')) return 'Alimentação';
  
  // Supermercado
  if (desc.includes('mercado') || desc.includes('carrefour') || desc.includes('extra')) return 'Supermercado';
  if (desc.includes('pão de açúcar') || desc.includes('walmart') || desc.includes('atacadão')) return 'Supermercado';
  
  // Transporte
  if (desc.includes('uber') || desc.includes('99')) return 'Transporte';
  if (desc.includes('combustível') || desc.includes('gasolina') || desc.includes('posto')) return 'Transporte';
  if (desc.includes('estacionamento') || desc.includes('pedágio')) return 'Transporte';
  
  // Assinaturas
  if (desc.includes('spotify') || desc.includes('netflix') || desc.includes('prime video')) return 'Assinaturas';
  if (desc.includes('amazon prime') || desc.includes('disney+') || desc.includes('youtube premium')) return 'Assinaturas';
  
  // Saúde
  if (desc.includes('farmácia') || desc.includes('drogaria') || desc.includes('remédio')) return 'Saúde';
  if (desc.includes('hospital') || desc.includes('clínica') || desc.includes('médico')) return 'Saúde';
  
  // Lazer
  if (desc.includes('cinema') || desc.includes('teatro') || desc.includes('show')) return 'Lazer';
  if (desc.includes('parque') || desc.includes('clube') || desc.includes('academia')) return 'Lazer';
  
  // Tecnologia
  if (desc.includes('google') || desc.includes('apple') || desc.includes('microsoft')) return 'Tecnologia';
  if (desc.includes('steam') || desc.includes('playstation') || desc.includes('xbox')) return 'Tecnologia';
  
  // Educação
  if (desc.includes('curso') || desc.includes('escola') || desc.includes('faculdade')) return 'Educação';
  if (desc.includes('livro') || desc.includes('livraria') || desc.includes('universidade')) return 'Educação';
  
  // Vestuário
  if (desc.includes('roupa') || desc.includes('calçado') || desc.includes('tênis')) return 'Vestuário';
  if (desc.includes('loja') || desc.includes('shopping') || desc.includes('fashion')) return 'Vestuário';
  
  // Pagamentos
  if (desc.includes('pagamento') || desc.includes('boleto') || desc.includes('fatura')) return 'Pagamentos';
  
  return 'Outros';
}
