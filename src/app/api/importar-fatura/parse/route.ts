import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Buscar categorias existentes do usuário
    const existingCategories = await prisma.category.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, type: true }
    });

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

    // Sugerir categorias usando regras simples com as categorias existentes
    const transactionsWithCategories = suggestCategories(transactions, existingCategories);

    return NextResponse.json({
      success: true,
      transactions: transactionsWithCategories,
      count: transactionsWithCategories.length,
      categories: existingCategories // Incluir categorias existentes na resposta
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
    const valor = parseValor(valorStr);

    // Valores negativos são pagamentos/estornos/créditos
    // Manter o sinal negativo para processamento correto

    transactions.push({
      data: dateISO,
      descricao: descricao.trim(),
      valor, // Manter com sinal (positivo ou negativo)
      tipo: valor < 0 ? 'credito' : 'debito',
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
 * Sugerir categorias usando regras simples com categorias existentes
 */
function suggestCategories(transactions: any[], existingCategories: any[]): any[] {
  return transactions.map(t => {
    const valor = typeof t.valor === 'number' ? t.valor : parseFloat(String(t.valor)) || 0;
    const isCredito = valor < 0;
    const categoryType = isCredito ? 'INCOME' : 'EXPENSE';
    
    const categoria = sugerirCategoria(t.descricao, existingCategories, categoryType, isCredito);
    
    return {
      ...t,
      categoriaSugerida: categoria.name,
      categoriaId: categoria.id || null, // Se encontrou categoria existente, usar o ID
      isNewCategory: !categoria.id // Flag para indicar se é categoria nova
    };
  });
}

/**
 * Função de sugestão de categoria que primeiro busca nas existentes
 */
function sugerirCategoria(descricao: string, existingCategories: any[], categoryType: string, isCredito: boolean = false): { name: string, id?: string } {
  if (!descricao) return { name: 'Outros' };
  
  const desc = descricao.toLowerCase();
  const relevantCategories = existingCategories.filter(cat => cat.type === categoryType || cat.type === 'BOTH');
  
  // Para créditos em faturas de cartão, verificar se é pagamento da fatura
  if (isCredito && (desc.includes('pagamento') || desc.includes('pag') || desc.includes('fatura') || 
                    desc.includes('credito') || desc.includes('estorno'))) {
    // Buscar categoria específica para pagamentos de cartão
    const pagamentoCategoria = relevantCategories.find(cat => 
      cat.name.toLowerCase().includes('pagamento') || 
      cat.name.toLowerCase().includes('cartão') ||
      cat.name.toLowerCase().includes('cartao') ||
      cat.name.toLowerCase().includes('fatura')
    );
    
    if (pagamentoCategoria) {
      return { name: pagamentoCategoria.name, id: pagamentoCategoria.id };
    }
    
    // Se não encontrou categoria específica, sugerir uma adequada para o contexto
    if (desc.includes('estorno')) {
      return { name: 'Estorno' };
    }
    return { name: 'Pagamento Cartão' };
  }
  
  // Primeiro tentar match exato ou parcial com categorias existentes
  for (const categoria of relevantCategories) {
    const categoryName = categoria.name.toLowerCase();
    
    // Match exato
    if (categoryName === desc) {
      return { name: categoria.name, id: categoria.id };
    }
    
    // Match parcial - categoria contém a descrição ou vice-versa
    if (desc.includes(categoryName) || categoryName.includes(desc)) {
      return { name: categoria.name, id: categoria.id };
    }
    
    // Match por palavras-chave específicas para categorias existentes
    if (matchesCategoryKeywords(desc, categoria.name)) {
      return { name: categoria.name, id: categoria.id };
    }
  }
  
  // Se não encontrou categoria existente, usar as regras específicas para fatura de cartão
  const suggestedName = sugerirCategoriaPorRegrasFatura(desc, isCredito);
  
  // Verificar se a categoria sugerida já existe (busca case-insensitive)
  const existingMatch = relevantCategories.find(cat => 
    cat.name.toLowerCase() === suggestedName.toLowerCase()
  );
  
  if (existingMatch) {
    return { name: existingMatch.name, id: existingMatch.id };
  }
  
  return { name: suggestedName };
}

/**
 * Verifica se a descrição corresponde a palavras-chave de uma categoria
 */
function matchesCategoryKeywords(descricao: string, categoryName: string): boolean {
  // Primeiro, tentar match mais inteligente baseado no nome da categoria
  const categoryLower = categoryName.toLowerCase();
  const descLower = descricao.toLowerCase();
  
  // Match por partes do nome da categoria (ex: "Alimentação" match com "aliment", "comida", etc.)
  const categoryWords = categoryLower.split(/[\s\-_]+/);
  for (const word of categoryWords) {
    if (word.length > 2 && descLower.includes(word)) {
      return true;
    }
  }
  
  // Match por palavras-chave específicas para categorias comuns
  const categoryKeywords: { [key: string]: string[] } = {
    'alimentação': ['ifood', 'rappi', 'uber eats', 'restaurante', 'lanchonete', 'pizzaria', 'bar', 'café', 'padaria', 'comida', 'food', 'delivery', 'lanch'],
    'supermercado': ['mercado', 'carrefour', 'extra', 'pão de açúcar', 'walmart', 'atacadão', 'compras', 'market', 'super'],
    'transporte': ['uber', '99', 'combustível', 'gasolina', 'posto', 'estacionamento', 'pedágio', 'taxi', 'transport', 'viagem'],
    'assinaturas': ['spotify', 'netflix', 'prime', 'disney', 'youtube', 'streaming', 'subscription', 'assinatura'],
    'saúde': ['farmácia', 'drogaria', 'remédio', 'hospital', 'clínica', 'médico', 'farm', 'health', 'medicina'],
    'lazer': ['cinema', 'teatro', 'show', 'parque', 'clube', 'academia', 'diversão', 'entretenimento'],
    'tecnologia': ['google', 'apple', 'microsoft', 'steam', 'playstation', 'xbox', 'app', 'software', 'tech'],
    'educação': ['curso', 'escola', 'faculdade', 'livro', 'livraria', 'universidade', 'educação', 'study'],
    'vestuário': ['roupa', 'calçado', 'tênis', 'loja', 'shopping', 'fashion', 'roupas', 'clothes'],
    'auto': ['posto', 'combustível', 'gasolina', 'oficina', 'peças', 'carro', 'auto', 'vehicle'],
    'telefonia': ['telefone', 'celular', 'tim', 'vivo', 'claro', 'oi', 'phone', 'mobile'],
    'investimentos': ['invest', 'aplicação', 'rendimento', 'poupança', 'cdb', 'fundo'],
    'farmácia': ['farmácia', 'drogaria', 'remédio', 'medicamento', 'droga', 'farm'],
    'fgts': ['fgts', 'saque', 'caixa'],
    'cartão': ['cartão', 'card', 'credit', 'débito'],
    'faculdade': ['faculdade', 'universidade', 'college', 'university', 'mensalidade'],
    'outros': ['outros', 'diversos', 'misc', 'other'],
    'recarga': ['recarga', 'crédito', 'recharge'],
    // ===== Categorias específicas para CRÉDITOS em fatura de cartão =====
    'pagamento cartão': ['pagamento', 'pag', 'fatura', 'quitação'],
    'estorno': ['estorno', 'cancelamento', 'devolução', 'devol'],
    'cashback': ['cashback', 'bonus', 'crédito', 'credit'],
    'ajuste': ['ajuste', 'correção', 'correcao', 'acerto'],
    'crédito cartão': ['crédito', 'credit', 'credito'],
    // ===== Manter outras para compatibilidade =====
    'transferência': ['transferência', 'transfer', 'pix', 'ted', 'doc']
  };
  
  // Buscar palavras-chave para a categoria
  const keywords = categoryKeywords[categoryLower];
  if (keywords) {
    return keywords.some(keyword => descLower.includes(keyword));
  }
  
  // Se não encontrou keywords específicas, tentar match por similaridade
  // Palavras curtas da categoria (mais de 3 letras)
  const significantWords = categoryWords.filter(w => w.length > 3);
  for (const word of significantWords) {
    if (descLower.includes(word.substring(0, 4))) { // Match parcial
      return true;
    }
  }
  
  return false;
}

/**
 * Função de sugestão por regras específicas para faturas de cartão de crédito
 */
function sugerirCategoriaPorRegrasFatura(descricao: string, isCredito: boolean): string {
  if (!descricao) return 'Outros';
  const desc = descricao.toLowerCase();
  
  // ===== CRÉDITOS (valores negativos) em fatura de cartão =====
  if (isCredito) {
    // Pagamentos da fatura
    if (desc.includes('pagamento') || desc.includes('pag ') || desc.includes('fatura')) return 'Pagamento Cartão';
    
    // Estornos de compras
    if (desc.includes('estorno') || desc.includes('cancelamento') || desc.includes('devolução')) return 'Estorno';
    
    // Cashback e créditos
    if (desc.includes('cashback') || desc.includes('bonus') || desc.includes('credito')) return 'Cashback';
    
    // Ajustes e correções
    if (desc.includes('ajuste') || desc.includes('correção') || desc.includes('correcao')) return 'Ajuste';
    
    return 'Crédito Cartão';
  }
  
  // ===== DÉBITOS (despesas) em fatura de cartão =====
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
  if (desc.includes('farmácia') || desc.includes('drogaria') || desc.includes('remédio')) return 'Farmácia';
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
  
  return 'Outros';
}

/**
 * Função original de sugestão por regras (mantida para compatibilidade)
 */
function sugerirCategoriaPorRegras(descricao: string): string {
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
