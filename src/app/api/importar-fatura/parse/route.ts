import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { analyzeTransactionWithAI } from '@/lib/ai-categorization';
import { 
  buildLearningMap, 
  suggestFromHistory, 
  type HistoricalTransaction 
} from '@/lib/smart-categorization';
import { logger } from '@/lib/logger';

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

    // Busca histórico de transações de cartão para auto-categorização
    let learningMap: any[] = [];
    let historyAvailable = false;
    
    try {
      const dateLimit = new Date();
      dateLimit.setMonth(dateLimit.getMonth() - 12); // Últimos 12 meses (ampliado para aprender mais)
      
      logger.info('Buscando histórico de transações de cartão para smart categorization...');
      
      // Busca despesas de cartão categorizadas
      const creditExpenses = await prisma.creditExpense.findMany({
        where: {
          userId: user.id,
          purchaseDate: { gte: dateLimit },
          OR: [
            { categoryId: { not: null } },
            { tags: { isEmpty: false } },
          ],
        },
        select: {
          id: true,
          description: true,
          amount: true,
          purchaseDate: true,
          categoryId: true,
          tags: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { purchaseDate: 'desc' },
        take: 1000, // Aumentado de 500 para 1000
      });
      
      // Busca receitas/créditos de cartão categorizadas
      const creditIncomes = await prisma.creditIncome.findMany({
        where: {
          userId: user.id,
          date: { gte: dateLimit },
          OR: [
            { categoryId: { not: null } },
            { tags: { isEmpty: false } },
          ],
        },
        select: {
          id: true,
          description: true,
          amount: true,
          date: true,
          categoryId: true,
          tags: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { date: 'desc' },
        take: 1000, // Aumentado de 500 para 1000
      });
      
      // Formata histórico para o sistema de categorização
      const history: HistoricalTransaction[] = [
        ...creditExpenses.map((e: any) => ({
          id: e.id,
          description: e.description,
          categoryId: e.categoryId,
          categoryName: e.category?.name,
          tags: e.tags || [],
          amount: Number(e.amount),
          date: e.purchaseDate,
          type: 'EXPENSE' as const,
        })),
        ...creditIncomes.map((i: any) => ({
          id: i.id,
          description: i.description,
          categoryId: i.categoryId,
          categoryName: i.category?.name,
          tags: i.tags || [],
          amount: Number(i.amount),
          date: i.date,
          type: 'INCOME' as const,
        })),
      ];
      
      if (history.length > 0) {
        learningMap = buildLearningMap(history);
        historyAvailable = true;
        logger.info(`Mapa de aprendizado de faturas criado com ${learningMap.length} padrões únicos de ${history.length} transações`);
      }
    } catch (error) {
      logger.error('Erro ao buscar histórico para auto-categorização de faturas:', error);
      // Continua sem o histórico
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

    // Sugerir categorias usando smart-categorization primeiro, depois IA, depois regras simples como fallback
    const transactionsWithCategories = await suggestCategories(transactions, existingCategories, user, learningMap, historyAvailable);

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
 * Sugerir categorias usando smart-categorization primeiro, depois IA, depois regras simples como fallback
 */
async function suggestCategories(transactions: any[], existingCategories: any[], user: any, learningMap: any[], historyAvailable: boolean): Promise<any[]> {
  const processedTransactions = [];
  
  logger.info(`Iniciando categorização de ${transactions.length} transações de fatura`);
  
  for (const t of transactions) {
    const valor = typeof t.valor === 'number' ? t.valor : parseFloat(String(t.valor)) || 0;
    const isCredito = valor < 0;
    const categoryType = isCredito ? 'INCOME' : 'EXPENSE';
    const transactionType: 'INCOME' | 'EXPENSE' = isCredito ? 'INCOME' : 'EXPENSE';
    
    logger.info(`Processando: "${t.descricao}" | Valor: ${valor} | Tipo: ${transactionType}`);
    
    let categoriaRecomendada = '';
    let categoriaId = '';
    let descricaoMelhorada = t.descricao;
    let tagsRecomendadas: string[] = [];
    let shouldCreateCategory = false;
    let smartSuggestion: any = null;
    let aiAnalysis: any = null;
    let suggestionSource = 'none'; // 'smart', 'ai', ou 'fallback'

    // Função para normalizar texto (igual ao extrato)
    const normalizar = (str: string) =>
      str
        ? str
            .normalize('NFD')
            .replace(/[^a-zA-Z0-9]/g, '')
            .toLowerCase()
        : '';
    const userNorm = user && user.name ? normalizar(user.name) : '';
    
    try {
      // 1. PRIMEIRO: Tenta auto-categorização baseada em histórico
      if (historyAvailable && learningMap.length > 0) {
        smartSuggestion = suggestFromHistory(
          t.descricao,
          Math.abs(valor),
          transactionType,
          learningMap
        );
        
        logger.info(`Smart match: "${t.descricao}" -> "${smartSuggestion.categoryName}" (${smartSuggestion.confidence}% confidence, reason: ${smartSuggestion.matchReason})`);
        
        // Usa sugestão do histórico se confiança >= 50% (reduzido de 60% para ser mais agressivo)
        if (smartSuggestion.confidence >= 50) {
          categoriaRecomendada = smartSuggestion.categoryName || '';
          categoriaId = smartSuggestion.categoryId || '';
          tagsRecomendadas = smartSuggestion.tags || [];
          descricaoMelhorada = t.descricao; // Mantém descrição original
          shouldCreateCategory = false; // Categoria já existe no histórico
          suggestionSource = 'smart';
          
          logger.info(`✓ Smart categorization aceita (Fatura): "${t.descricao}" -> "${categoriaRecomendada}" (${smartSuggestion.confidence}% confidence)`);
        } else {
          logger.info(`✗ Smart categorization rejeitada (confiança ${smartSuggestion.confidence}% < 50%), tentando IA...`);
        }
      }
      
      // 2. SEGUNDO: Se smart categorization não teve confiança suficiente, usa IA
      if (suggestionSource === 'none' && user && t.descricao) {
        aiAnalysis = await analyzeTransactionWithAI(t.descricao, valor, existingCategories);
        let suggested = aiAnalysis.suggestedCategory;
        
        // Função para remover acentos (igual ao extrato)
        const removeAcentos = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        // Verifica se categoria sugerida já existe
        const categoriaExistente = existingCategories.find(
          (cat: any) =>
            removeAcentos(cat.name.toLowerCase()) === removeAcentos(suggested.toLowerCase()),
        );
        
        if (categoriaExistente) {
          categoriaRecomendada = categoriaExistente.name;
          categoriaId = categoriaExistente.id;
          shouldCreateCategory = false;
        } else {
          categoriaRecomendada = suggested;
          shouldCreateCategory = true;
        }
        
        descricaoMelhorada = aiAnalysis.enhancedDescription;
        
        // Verifica tags e filtra apenas as que não existem
        const tagsExistentes = await prisma.tag.findMany({ 
          where: { userId: user.id },
          select: { name: true }
        });
        
        const tagsNaoExistentes = aiAnalysis.suggestedTags.filter((tagSugerida: string) => {
          return !tagsExistentes.some(
            (tagExistente: { name: string }) =>
              removeAcentos(tagExistente.name.toLowerCase()) ===
              removeAcentos(tagSugerida.toLowerCase()),
          );
        });
        tagsRecomendadas = tagsNaoExistentes;
        
        // Se a IA sugeriu "Outros", não marcar como fonte e deixar fallback tentar
        if (removeAcentos(categoriaRecomendada.toLowerCase()) !== 'outros') {
          suggestionSource = 'ai';
        }
      }
    } catch (error) {
      console.error('Erro na análise:', error);
      // Continua para o fallback abaixo
    }
    
    // 3. FALLBACK: método de regras se smart e IA não funcionaram OU se IA retornou "Outros"
    if (suggestionSource === 'none') {
      const categoriaSugerida = sugerirCategoriaPorRegrasFatura(t.descricao, isCredito);
      
      logger.info(`Fallback categorization (Fatura): "${t.descricao}" -> "${categoriaSugerida}"`);
      
      // Função para remover acentos (igual ao extrato)
      const removeAcentos = (str: string) => str.normalize('NFD').replace(/[̀-ͯ]/g, '');
      
      const categoriaExistente = existingCategories.find(
        (cat: any) =>
          removeAcentos(cat.name.toLowerCase()) ===
          removeAcentos(categoriaSugerida.toLowerCase()),
      );
      
      if (categoriaExistente) {
        categoriaRecomendada = categoriaExistente.name;
        categoriaId = categoriaExistente.id;
        shouldCreateCategory = false;
      } else {
        categoriaRecomendada = categoriaSugerida;
        shouldCreateCategory = true;
      }
      suggestionSource = 'fallback';
    }
    
    logger.info(`Resultado: "${t.descricao}" -> "${categoriaRecomendada}" (fonte: ${suggestionSource})`);
    
    processedTransactions.push({
      ...t,
      categoriaSugerida: categoriaRecomendada,
      categoriaId: categoriaId || null,
      isNewCategory: shouldCreateCategory,
      descricaoMelhorada,
      tagsRecomendadas,
      suggestionSource, // Para debug
      smartMatch: smartSuggestion ? {
        confidence: smartSuggestion.confidence,
        matchReason: smartSuggestion.matchReason,
        matchedDescription: smartSuggestion.matchedTransaction?.description,
      } : null,
      aiAnalysis: aiAnalysis
        ? {
            confidence: aiAnalysis.confidence,
            merchant: aiAnalysis.merchant,
            location: aiAnalysis.location,
            categoryType: aiAnalysis.categoryType,
          }
        : null,
    });
  }
  
  return processedTransactions;
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
  const categoryLower = categoryName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const descLower = descricao.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Match direto se descrição contém o nome da categoria
  if (descLower.includes(categoryLower)) {
    return true;
  }
  
  // Match por partes do nome da categoria (ex: "Alimentação" match com "aliment", "comida", etc.)
  const categoryWords = categoryLower.split(/[\s\-_]+/);
  for (const word of categoryWords) {
    if (word.length > 3 && descLower.includes(word)) {
      return true;
    }
  }
  
  // Match por palavras-chave específicas para categorias comuns
  const categoryKeywords: { [key: string]: string[] } = {
    'alimentacao': ['ifood', 'rappi', 'uber eats', 'ubereats', 'restaurante', 'lanchonete', 'pizzaria', 'bar', 'cafe', 'padaria', 'comida', 'food', 'delivery', 'lanch', 'mcdonald', 'burger', 'subway', 'kfc', 'hamburgueria', 'outback', 'bobs', 'giraffas'],
    'supermercado': ['mercado', 'carrefour', 'extra', 'pao de acucar', 'walmart', 'atacadao', 'compras', 'market', 'super', 'assai', 'makro', 'hortifruti', 'sacolao', 'emporio', 'minimercado'],
    'transporte': ['uber', '99', 'combustivel', 'gasolina', 'etanol', 'diesel', 'posto', 'estacionamento', 'pedagio', 'taxi', 'transport', 'viagem', 'shell', 'ipiranga', 'petrobras', 'cabify', 'moto', 'br distribuidora'],
    'assinaturas': ['spotify', 'netflix', 'prime', 'disney', 'youtube', 'streaming', 'subscription', 'assinatura', 'hbo', 'max', 'crunchyroll', 'globoplay', 'deezer', 'apple music', 'paramount', 'amazon', 'prime video'],
    'saude': ['farmacia', 'drogaria', 'remedio', 'hospital', 'clinica', 'medico', 'farm', 'health', 'medicina', 'dentista', 'laborat', 'exame', 'consulta', 'drogasil', 'raia', 'pacheco', 'ultrafarma', 'pague menos'],
    'farmacia': ['farmacia', 'drogaria', 'remedio', 'medicamento', 'droga', 'farm', 'drogasil', 'raia', 'pacheco', 'ultrafarma', 'pague menos'],
    'lazer': ['cinema', 'teatro', 'show', 'parque', 'clube', 'diversao', 'entretenimento', 'ingresso', 'cinemark', 'kinoplex'],
    'academia': ['academia', 'smartfit', 'bodytech', 'fitness', 'ginastica', 'musculacao', 'sport', 'gym'],
    'tecnologia': ['google', 'apple', 'microsoft', 'steam', 'playstation', 'xbox', 'app', 'software', 'tech', 'nintendo', 'adobe', 'epic games', 'app store', 'play store', 'samsung', 'lg', 'dell'],
    'educacao': ['curso', 'escola', 'faculdade', 'livro', 'livraria', 'universidade', 'educacao', 'study', 'mensalidade', 'udemy', 'coursera', 'alura', 'material escolar', 'apostila', 'college'],
    'vestuario': ['roupa', 'calcado', 'tenis', 'sapato', 'loja', 'shopping', 'fashion', 'roupas', 'clothes', 'moda', 'renner', 'c&a', 'riachuelo', 'zara', 'hering', 'marisa'],
    'auto': ['posto', 'combustivel', 'gasolina', 'oficina', 'pecas', 'carro', 'auto', 'vehicle', 'mecanica'],
    'telefonia': ['telefone', 'celular', 'tim', 'vivo', 'claro', 'oi', 'phone', 'mobile', 'recarga', 'internet', 'nextel', 'algar'],
    'investimentos': ['invest', 'aplicacao', 'rendimento', 'poupanca', 'cdb', 'fundo', 'acoes'],
    'fgts': ['fgts', 'saque', 'caixa'],
    'cartao': ['cartao', 'card', 'credit', 'debito'],
    'faculdade': ['faculdade', 'universidade', 'college', 'university', 'mensalidade', 'unip', 'anhanguera', 'estacio', 'unopar'],
    'outros': ['outros', 'diversos', 'misc', 'other'],
    'recarga': ['recarga', 'credito', 'recharge'],
    'pet': ['pet', 'veterinari', 'racao', 'animal', 'petshop'],
    'beleza': ['salao', 'cabeleireiro', 'barbeiro', 'manicure', 'perfume', 'cosmetico', 'maquiagem', 'estetica'],
    'moradia': ['aluguel', 'condominio', 'imovel'],
    'contas': ['luz', 'energia', 'agua', 'gas', 'enel', 'copel', 'cemig', 'sabesp'],
    'compras': ['compra', 'loja', 'shop', 'store', 'comercio'],
    // ===== Categorias específicas para CRÉDITOS em fatura de cartão =====
    'pagamento cartao': ['pagamento', 'pag', 'fatura', 'quitacao'],
    'estorno': ['estorno', 'cancelamento', 'devolucao', 'devol'],
    'cashback': ['cashback', 'bonus', 'credito', 'credit'],
    'ajuste': ['ajuste', 'correcao', 'acerto'],
    'credito cartao': ['credito', 'credit'],
    // ===== Manter outras para compatibilidade =====
    'transferencia': ['transferencia', 'transfer', 'pix', 'ted', 'doc']
  };
  
  // Buscar palavras-chave para a categoria (removendo acentos)
  const keywords = categoryKeywords[categoryLower];
  if (keywords) {
    return keywords.some(keyword => descLower.includes(keyword));
  }
  
  // Se não encontrou keywords específicas, tentar match por similaridade parcial
  // Palavras curtas da categoria (mais de 4 letras)
  const significantWords = categoryWords.filter(w => w.length > 4);
  for (const word of significantWords) {
    // Match parcial com primeiras 4 letras
    if (descLower.includes(word.substring(0, 4))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Função de sugestão por regras específicas para faturas de cartão de crédito
 * Usa correspondência agressiva para evitar retornar 'Outros'
 */
function sugerirCategoriaPorRegrasFatura(descricao: string, isCredito: boolean): string {
  if (!descricao) {
    logger.info('Descrição vazia, retornando "Compras"');
    return 'Compras';
  }
  
  // Normalizar descrição removendo acentos, caracteres especiais e múltiplos espaços
  const desc = descricao
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .trim()
    .replace(/\s+/g, ' ');
  
  logger.info(`Fallback tentando categorizar: "${descricao}" (normalizado: "${desc}") | isCredito: ${isCredito}`);
  
  // ===== CRÉDITOS (valores negativos) em fatura de cartão =====
  if (isCredito) {
    // Pagamentos da fatura
    if (desc.includes('pagamento') || desc.includes('pag ') || desc.includes('fatura')) {
      logger.info('Match: Pagamento Cartão');
      return 'Pagamento Cartão';
    }
    
    // Estornos de compras
    if (desc.includes('estorno') || desc.includes('cancelamento') || desc.includes('devolucao') || desc.includes('devol')) {
      logger.info('Match: Estorno');
      return 'Estorno';
    }
    
    // Cashback e créditos
    if (desc.includes('cashback') || desc.includes('bonus') || desc.includes('credito')) {
      logger.info('Match: Cashback');
      return 'Cashback';
    }
    
    // Ajustes e correções
    if (desc.includes('ajuste') || desc.includes('correcao') || desc.includes('acerto')) {
      logger.info('Match: Ajuste');
      return 'Ajuste';
    }
    
    logger.info('Crédito sem regra específica: Crédito Cartão');
    return 'Crédito Cartão';
  }
  
  // ===== DÉBITOS (despesas) em fatura de cartão =====
  // Alimentação e delivery
  if (desc.includes('ifood') || desc.includes('rappi') || desc.includes('uber eats') || desc.includes('ubereats')) {
    logger.info('Match: Alimentação (delivery)');
    return 'Alimentação';
  }
  if (desc.includes('restaurante') || desc.includes('lanchonete') || desc.includes('pizzaria') || desc.includes('hamburgueria')) {
    logger.info('Match: Alimentação (restaurante)');
    return 'Alimentação';
  }
  if (desc.includes('bar ') || desc.includes('cafe') || desc.includes('padaria') || desc.includes('panificadora')) {
    logger.info('Match: Alimentação (café/bar)');
    return 'Alimentação';
  }
  if (desc.includes('food') || desc.includes('delivery') || desc.includes('lanches') || desc.includes('comida')) {
    logger.info('Match: Alimentação (food)');
    return 'Alimentação';
  }
  if (desc.includes('mcdonald') || desc.includes('burger king') || desc.includes('subway') || desc.includes('kfc')) {
    logger.info('Match: Alimentação (fast food)');
    return 'Alimentação';
  }
  
  // Supermercado e mercado
  if (desc.includes('mercado') || desc.includes('carrefour') || desc.includes('extra') || desc.includes('pao de acucar')) {
    logger.info('Match: Supermercado');
    return 'Supermercado';
  }
  if (desc.includes('walmart') || desc.includes('atacadao') || desc.includes('assai') || desc.includes('makro')) {
    logger.info('Match: Supermercado (atacado)');
    return 'Supermercado';
  }
  if (desc.includes('hortifruti') || desc.includes('sacolao') || desc.includes('market')) {
    logger.info('Match: Supermercado (outros)');
    return 'Supermercado';
  }
  
  // Transporte e mobilidade
  if (desc.includes('uber') && !desc.includes('uber eats')) {
    logger.info('Match: Transporte (uber)');
    return 'Transporte';
  }
  if (desc.includes('99') && !desc.includes('99 food')) {
    logger.info('Match: Transporte (99)');
    return 'Transporte';
  }
  if (desc.includes('combustível') || desc.includes('gasolina') || desc.includes('etanol') || desc.includes('diesel')) return 'Transporte';
  if (desc.includes('posto') || desc.includes('shell') || desc.includes('ipiranga') || desc.includes('petrobras')) return 'Transporte';
  if (desc.includes('estacionamento') || desc.includes('pedágio') || desc.includes('estacion') || desc.includes('park')) return 'Transporte';
  if (desc.includes('taxi') || desc.includes('moto') || desc.includes('cabify')) return 'Transporte';
  
  // Assinaturas e serviços digitais
  if (desc.includes('spotify') || desc.includes('netflix') || desc.includes('prime video') || desc.includes('amazon prime')) return 'Assinaturas';
  if (desc.includes('disney+') || desc.includes('disney plus') || desc.includes('hbo') || desc.includes('max')) return 'Assinaturas';
  if (desc.includes('youtube premium') || desc.includes('crunchyroll') || desc.includes('globoplay')) return 'Assinaturas';
  if (desc.includes('deezer') || desc.includes('apple music') || desc.includes('paramount+')) return 'Assinaturas';
  
  // Saúde e farmácia
  if (desc.includes('farmácia') || desc.includes('drogaria') || desc.includes('remédio') || desc.includes('medicamento')) return 'Farmácia';
  if (desc.includes('drogasil') || desc.includes('raia') || desc.includes('pacheco') || desc.includes('ultrafarma')) return 'Farmácia';
  if (desc.includes('hospital') || desc.includes('clínica') || desc.includes('médico') || desc.includes('dentista')) return 'Saúde';
  if (desc.includes('laborat') || desc.includes('exame') || desc.includes('consulta')) return 'Saúde';
  
  // Lazer e entretenimento
  if (desc.includes('cinema') || desc.includes('teatro') || desc.includes('show') || desc.includes('ingresso')) return 'Lazer';
  if (desc.includes('parque') || desc.includes('clube') || desc.includes('diversão')) return 'Lazer';
  if (desc.includes('academia') || desc.includes('smartfit') || desc.includes('bodytech') || desc.includes('fitness')) return 'Academia';
  
  // Tecnologia e games
  if (desc.includes('google') || desc.includes('apple') || desc.includes('microsoft') || desc.includes('adobe')) return 'Tecnologia';
  if (desc.includes('steam') || desc.includes('playstation') || desc.includes('xbox') || desc.includes('nintendo')) return 'Tecnologia';
  if (desc.includes('app store') || desc.includes('play store') || desc.includes('epic games')) return 'Tecnologia';
  
  // Educação
  if (desc.includes('curso') || desc.includes('escola') || desc.includes('faculdade') || desc.includes('universidade')) return 'Educação';
  if (desc.includes('livro') || desc.includes('livraria') || desc.includes('material escolar') || desc.includes('mensalidade')) return 'Educação';
  if (desc.includes('udemy') || desc.includes('coursera') || desc.includes('alura')) return 'Educação';
  
  // Vestuário e moda
  if (desc.includes('roupa') || desc.includes('calçado') || desc.includes('tênis') || desc.includes('sapato')) return 'Vestuário';
  if (desc.includes('loja') || desc.includes('shopping') || desc.includes('fashion') || desc.includes('moda')) return 'Vestuário';
  if (desc.includes('renner') || desc.includes('c&a') || desc.includes('riachuelo') || desc.includes('zara')) return 'Vestuário';
  
  // Telefonia e internet
  if (desc.includes('tim') || desc.includes('vivo') || desc.includes('claro') || desc.includes('oi')) return 'Telefonia';
  if (desc.includes('telefone') || desc.includes('celular') || desc.includes('recarga') || desc.includes('internet')) return 'Telefonia';
  
  // Moradia e utilidades
  if (desc.includes('aluguel') || desc.includes('condomínio') || desc.includes('condominio')) return 'Moradia';
  if (desc.includes('luz') || desc.includes('energia') || desc.includes('água') || desc.includes('gas')) return 'Contas';
  
  // Pets
  if (desc.includes('pet') || desc.includes('veterinári') || desc.includes('ração') || desc.includes('racao')) return 'Pet';
  
  // Beleza e cuidados pessoais
  if (desc.includes('salão') || desc.includes('salao') || desc.includes('cabeleireiro') || desc.includes('barbeiro') || desc.includes('manicure')) return 'Beleza';
  if (desc.includes('perfume') || desc.includes('cosmético') || desc.includes('cosmetico') || desc.includes('maquiagem')) return 'Beleza';
  
  // === TENTATIVAS MAIS AGRESSIVAS ANTES DE RETORNAR 'OUTROS' ===
  
  // Verifica se tem números de cartão mascarados (provavelmente compra genérica)
  if (/\d{4}[*\s]/.test(desc) || desc.match(/\*{3,}/)) return 'Compras';
  
  // Verifica se tem palavras relacionadas a comércio eletrônico
  if (desc.includes('www.') || desc.includes('.com') || desc.includes('online') || desc.includes('ecommerce')) return 'Compras Online';
  
  // Se tem "pagamento" mas não foi capturado acima
  if (desc.includes('pagamento') || desc.includes('pgto')) return 'Pagamentos';
  
  // Se tem números e letras misturados de forma aleatória (provavelmente estabelecimento)
  if (desc.length > 10 && /[a-z]+.*\d+.*[a-z]+/i.test(desc)) return 'Compras';
  
  // Se contém palavras como "ltda", "eireli", "sa", "me" (empresa)
  if (desc.includes('ltda') || desc.includes('eireli') || desc.includes(' sa') || desc.includes(' me ')) return 'Compras';
  
  // Se tem indicadores de estabelecimento comercial
  if (desc.includes('comercio') || desc.includes('comércio') || desc.includes('servicos') || desc.includes('serviços')) return 'Compras';
  
  // Último recurso: se é uma despesa (não crédito) e não conseguimos categorizar, é provavelmente uma compra
  if (!isCredito) {
    logger.info(`Fallback: Despesa não categorizada, retornando "Compras"`);
    return 'Compras';
  }
  
  logger.info(`Fallback: Nenhuma regra aplicada, retornando "Outros"`);
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
