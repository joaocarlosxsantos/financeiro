/**
 * Serviço de categorização inteligente usando IA
 * Melhora a importação de extratos com análise automática de transações
 */

export interface TransactionAnalysis {
  originalDescription: string;
  enhancedDescription: string;
  suggestedCategory: string;
  confidence: number;
  shouldCreateCategory: boolean;
  categoryType: 'EXPENSE' | 'INCOME' | 'BOTH';
  suggestedTags: string[];
  merchant?: string;
  location?: string;
}

export interface CategorySuggestion {
  name: string;
  type: 'EXPENSE' | 'INCOME' | 'BOTH';
  color: string;
  icon?: string;
  confidence: number;
}

/**
 * Analisa uma transação e sugere categoria, descrição melhorada e tags
 */
export async function analyzeTransactionWithAI(
  description: string,
  amount: number,
  existingCategories: Array<{ name: string; type: string }>
): Promise<TransactionAnalysis> {
  // Normaliza a descrição
  const normalizedDesc = normalizeDescription(description);
  
  // Detecta o tipo de transação (receita ou despesa)
  const isIncome = amount > 0;
  const categoryType = isIncome ? 'INCOME' : 'EXPENSE';
  
  // Extrai informações da descrição
  const merchantInfo = extractMerchantInfo(normalizedDesc);
  const enhancedDescription = enhanceDescription(normalizedDesc, merchantInfo);
  
  // Sugere categoria baseada na descrição melhorada
  const categorySuggestion = suggestCategoryFromDescription(
    enhancedDescription,
    categoryType,
    existingCategories
  );
  
  // Sugere tags baseadas no contexto
  const suggestedTags = suggestTags(enhancedDescription, merchantInfo);
  
  return {
    originalDescription: description,
    enhancedDescription,
    suggestedCategory: categorySuggestion.name,
    confidence: categorySuggestion.confidence,
    shouldCreateCategory: categorySuggestion.confidence > 0.7 && 
      !existingCategories.some(cat => 
        cat.name.toLowerCase() === categorySuggestion.name.toLowerCase()
      ),
    categoryType,
    suggestedTags,
    merchant: merchantInfo.merchant,
    location: merchantInfo.location
  };
}

/**
 * Normaliza a descrição removendo ruídos e padronizando
 */
function normalizeDescription(description: string): string {
  if (!description) return '';
  
  return description
    .trim()
    .replace(/\*/g, '') // Remove asteriscos
    .replace(/\s+/g, ' ') // Normaliza espaços
    .replace(/[^\w\s\-]/g, ' ') // Remove caracteres especiais exceto hífen
    .trim();
}

/**
 * Extrai informações do comerciante/estabelecimento
 */
function extractMerchantInfo(description: string): {
  merchant?: string;
  location?: string;
  category_hint?: string;
} {
  const desc = description.toLowerCase();
  
  // Padrões para extrair informações
  const patterns = {
    // Compras com cartão
    cardPurchase: /(?:compra|compras)\s+(?:débito|debito|crédito|credito|cartão|cartao)\s*[-:]?\s*(.+)$/i,
    // PIX/Transferências
    pix: /pix\s+(?:para|de|enviado|recebido)?\s*[-:]?\s*(.+)$/i,
    // Estabelecimentos conhecidos
    establishments: {
      'uber': { category: 'Transporte', type: 'ride_sharing' },
      '99': { category: 'Transporte', type: 'ride_sharing' },
      'ifood': { category: 'Alimentação', type: 'food_delivery' },
      'mercado livre': { category: 'Compras Online', type: 'marketplace' },
      'amazon': { category: 'Compras Online', type: 'marketplace' },
      'netflix': { category: 'Assinaturas', type: 'streaming' },
      'spotify': { category: 'Assinaturas', type: 'music' },
      'nubank': { category: 'Serviços Bancários', type: 'bank' },
      'pagseguro': { category: 'Pagamentos', type: 'payment_service' },
      'mercado': { category: 'Supermercado', type: 'grocery' },
      'farmacia': { category: 'Saúde', type: 'pharmacy' },
      'posto': { category: 'Combustível', type: 'gas_station' }
    }
  };
  
  // Verifica estabelecimentos conhecidos
  for (const [key, info] of Object.entries(patterns.establishments)) {
    if (desc.includes(key)) {
      return {
        merchant: key.charAt(0).toUpperCase() + key.slice(1),
        category_hint: info.category
      };
    }
  }
  
  // Extrai merchant de compras com cartão
  const cardMatch = description.match(patterns.cardPurchase);
  if (cardMatch) {
    const merchant = cardMatch[1].trim();
    return {
      merchant: formatMerchantName(merchant),
      category_hint: 'Compras'
    };
  }
  
  // Extrai informações de PIX
  const pixMatch = description.match(patterns.pix);
  if (pixMatch) {
    return {
      merchant: formatMerchantName(pixMatch[1].trim()),
      category_hint: 'Transferência'
    };
  }
  
  return {};
}

/**
 * Formata o nome do estabelecimento
 */
function formatMerchantName(name: string): string {
  if (!name) return '';
  
  // Remove números mascarados (ex: "99* 99*" -> "99")
  name = name.replace(/\d+\*\s*/g, (match) => match.replace(/\*/g, '').trim());
  
  // Capitaliza palavras
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

/**
 * Melhora a descrição da transação
 */
function enhanceDescription(originalDesc: string, merchantInfo: any): string {
  if (!originalDesc) return 'Transação';
  
  // Se temos informações do comerciante, usa elas
  if (merchantInfo.merchant) {
    return merchantInfo.merchant;
  }
  
  // Melhora descrições genéricas
  const improvements: Record<string, string> = {
    'pix': 'Transferência PIX',
    'ted': 'Transferência TED',
    'doc': 'Transferência DOC',
    'saque': 'Saque em Dinheiro',
    'deposito': 'Depósito',
    'tarifa': 'Tarifa Bancária',
    'juros': 'Juros',
    'rendimento': 'Rendimento de Investimento',
    'fgts': 'FGTS',
    'salario': 'Salário',
    'aposentadoria': 'Aposentadoria',
    'pensao': 'Pensão'
  };
  
  const desc = originalDesc.toLowerCase();
  for (const [key, improvement] of Object.entries(improvements)) {
    if (desc.includes(key)) {
      return improvement;
    }
  }
  
  // Se não encontrou melhoria, capitaliza a original
  return originalDesc
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Sugere categoria baseada na descrição
 */
function suggestCategoryFromDescription(
  description: string,
  type: 'EXPENSE' | 'INCOME',
  existingCategories: Array<{ name: string; type: string }>
): CategorySuggestion {
  const desc = description.toLowerCase();
  
  // Mapeamento inteligente de categorias
  const categoryMappings = {
    // Despesas
    EXPENSE: {
      'alimentação': ['comida', 'restaurante', 'lanchonete', 'ifood', 'uber eats', 'bar', 'padaria'],
      'supermercado': ['mercado', 'supermercado', 'carrefour', 'pão de açúcar', 'extra'],
      'transporte': ['uber', '99', 'taxi', 'combustível', 'posto', 'gasolina', 'passagem'],
      'saúde': ['farmácia', 'drogaria', 'hospital', 'médico', 'dentista', 'consulta'],
      'educação': ['escola', 'faculdade', 'curso', 'livro', 'educação'],
      'lazer': ['cinema', 'teatro', 'parque', 'show', 'evento', 'diversão'],
      'tecnologia': ['google', 'apple', 'microsoft', 'amazon', 'software'],
      'assinaturas': ['netflix', 'spotify', 'amazon prime', 'disney+', 'assinatura'],
      'casa': ['aluguel', 'condomínio', 'luz', 'água', 'gás', 'internet', 'telefone'],
      'roupas': ['roupa', 'calçado', 'sapato', 'tênis', 'camisa', 'vestido'],
      'investimentos': ['aplicação', 'investimento', 'tesouro', 'ações', 'fundo'],
      'impostos': ['imposto', 'iptu', 'ipva', 'ir', 'taxa'],
      'cartão de crédito': ['fatura', 'cartão', 'crédito'],
      'transferência': ['pix', 'ted', 'doc', 'transferência'],
      'serviços': ['banco', 'tarifa', 'serviço'],
      'outros': []
    },
    // Receitas
    INCOME: {
      'salário': ['salário', 'salario', 'ordenado', 'pagamento'],
      'freelance': ['freelance', 'freela', 'trabalho extra'],
      'vendas': ['venda', 'vendas', 'mercado livre'],
      'investimentos': ['rendimento', 'dividendos', 'juros', 'aplicação'],
      'benefícios': ['fgts', 'pis', 'auxílio', 'benefício'],
      'aposentadoria': ['aposentadoria', 'pensão', 'inss'],
      'transferência': ['pix', 'ted', 'doc', 'transferência'],
      'outros': []
    }
  };
  
  const mappings = categoryMappings[type];
  let bestMatch: CategorySuggestion = {
    name: type === 'EXPENSE' ? 'Outros' : 'Outros',
    type,
    color: '#6B7280',
    confidence: 0.3
  };
  
  // Procura a melhor categoria
  for (const [categoryName, keywords] of Object.entries(mappings)) {
    const confidence = calculateCategoryConfidence(desc, keywords);
    if (confidence > bestMatch.confidence) {
      bestMatch = {
        name: categoryName.charAt(0).toUpperCase() + categoryName.slice(1),
        type,
        color: getCategoryColor(categoryName),
        icon: getCategoryIcon(categoryName),
        confidence
      };
    }
  }
  
  // Verifica se já existe uma categoria similar
  const existingMatch = findSimilarCategory(bestMatch.name, existingCategories);
  if (existingMatch) {
    return {
      ...bestMatch,
      name: existingMatch.name,
      confidence: Math.min(bestMatch.confidence + 0.2, 1.0)
    };
  }
  
  return bestMatch;
}

/**
 * Calcula a confiança da categoria baseada nas palavras-chave
 */
function calculateCategoryConfidence(description: string, keywords: string[]): number {
  if (keywords.length === 0) return 0.1;
  
  let matches = 0;
  let totalScore = 0;
  
  for (const keyword of keywords) {
    if (description.includes(keyword)) {
      matches++;
      // Pontuação baseada no tamanho da palavra-chave (palavras maiores = mais específicas)
      totalScore += keyword.length / 10;
    }
  }
  
  if (matches === 0) return 0.1;
  
  // Normaliza a pontuação
  const confidence = Math.min((matches / keywords.length) + (totalScore / keywords.length), 1.0);
  return Math.max(confidence, 0.1);
}

/**
 * Encontra categoria similar nas existentes
 */
function findSimilarCategory(
  suggestedName: string,
  existingCategories: Array<{ name: string; type: string }>
): { name: string } | null {
  const normalized = suggestedName.toLowerCase();
  
  for (const category of existingCategories) {
    const existingNormalized = category.name.toLowerCase();
    
    // Verifica correspondência exata
    if (normalized === existingNormalized) {
      return { name: category.name };
    }
    
    // Verifica similaridade (palavras em comum)
    const suggestedWords = normalized.split(' ');
    const existingWords = existingNormalized.split(' ');
    
    const commonWords = suggestedWords.filter(word => 
      existingWords.some(existingWord => 
        existingWord.includes(word) || word.includes(existingWord)
      )
    );
    
    // Se mais de 50% das palavras são similares, considera match
    if (commonWords.length / suggestedWords.length > 0.5) {
      return { name: category.name };
    }
  }
  
  return null;
}

/**
 * Sugere tags baseadas no contexto
 */
function suggestTags(description: string, merchantInfo: any): string[] {
  const tags: string[] = [];
  const desc = description.toLowerCase();
  
  // Tags baseadas no método de pagamento
  if (desc.includes('pix')) tags.push('PIX');
  if (desc.includes('cartão') || desc.includes('cartao')) tags.push('Cartão');
  if (desc.includes('dinheiro')) tags.push('Dinheiro');
  
  // Tags baseadas no tipo de estabelecimento
  if (merchantInfo.merchant) {
    tags.push(merchantInfo.merchant);
  }
  
  // Tags baseadas em contexto
  if (desc.includes('online')) tags.push('Online');
  if (desc.includes('delivery')) tags.push('Delivery');
  if (desc.includes('mensalidade') || desc.includes('assinatura')) tags.push('Recorrente');
  
  return tags.slice(0, 3); // Limita a 3 tags
}

/**
 * Retorna cor da categoria
 */
function getCategoryColor(categoryName: string): string {
  const colorMap: Record<string, string> = {
    'alimentação': '#EF4444',
    'supermercado': '#10B981',
    'transporte': '#3B82F6',
    'saúde': '#EF4444',
    'educação': '#8B5CF6',
    'lazer': '#F59E0B',
    'tecnologia': '#06B6D4',
    'assinaturas': '#8B5CF6',
    'casa': '#84CC16',
    'roupas': '#EC4899',
    'investimentos': '#10B981',
    'impostos': '#EF4444',
    'cartão de crédito': '#F97316',
    'transferência': '#6B7280',
    'serviços': '#6B7280',
    'salário': '#10B981',
    'freelance': '#3B82F6',
    'vendas': '#F59E0B',
    'benefícios': '#8B5CF6',
    'aposentadoria': '#10B981',
    'outros': '#6B7280'
  };
  
  return colorMap[categoryName.toLowerCase()] || '#6B7280';
}

/**
 * Retorna ícone da categoria
 */
function getCategoryIcon(categoryName: string): string | undefined {
  const iconMap: Record<string, string> = {
    'alimentação': '🍽️',
    'supermercado': '🛒',
    'transporte': '🚗',
    'saúde': '⚕️',
    'educação': '📚',
    'lazer': '🎬',
    'tecnologia': '💻',
    'assinaturas': '📱',
    'casa': '🏠',
    'roupas': '👕',
    'investimentos': '💰',
    'impostos': '📋',
    'cartão de crédito': '💳',
    'transferência': '💸',
    'salário': '💼',
    'freelance': '🔨',
    'vendas': '💰'
  };
  
  return iconMap[categoryName.toLowerCase()];
}

/**
 * Processa múltiplas transações em lote
 */
export async function batchAnalyzeTransactions(
  transactions: Array<{ description: string; amount: number }>,
  existingCategories: Array<{ name: string; type: string }>
): Promise<TransactionAnalysis[]> {
  const results: TransactionAnalysis[] = [];
  
  for (const transaction of transactions) {
    const analysis = await analyzeTransactionWithAI(
      transaction.description,
      transaction.amount,
      existingCategories
    );
    results.push(analysis);
  }
  
  return results;
}