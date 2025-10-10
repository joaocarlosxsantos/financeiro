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
  
  let normalized = description
    .trim()
    .toLowerCase()
    .replace(/\*/g, '') // Remove asteriscos
    .replace(/\s+/g, ' ') // Normaliza espaços
    .replace(/[^\w\s\-]/g, ' ') // Remove caracteres especiais exceto hífen
    .trim();
  
  // Remove sufixos de localização comuns (bh, sp, rj, mg, etc.)
  const locationSuffixes = [
    /\s+(bh|sp|rj|mg|go|df|pr|sc|rs|pe|ba|ce|pb|al|se|pi|ma|ap|ac|ro|rr|am|pa|to)(\s+\w+)*$/i,
    /\s+\d{5}[-\s]?\d{3}$/i, // CEP
    /\s+(centro|shopping|mall|plaza|outlet)(\s+\w+)*$/i,
    /\s+(norte|sul|leste|oeste|centro)(\s+\w+)*$/i,
    /\s+(ltda|me|eireli|s\.a\.|sa)$/i // Sufixos empresariais
  ];
  
  for (const suffix of locationSuffixes) {
    normalized = normalized.replace(suffix, '').trim();
  }
  
  return normalized;
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
      'alimentação': ['comida', 'restaurante', 'lanchonete', 'ifood', 'uber eats', 'bar', 'padaria', 'pizza', 'burguer', 'lanche', 'refeição', 'jantar', 'almoço'],
      'supermercado': ['mercado', 'supermercado', 'supermercados', 'carrefour', 'pão de açúcar', 'extra', 'compras', 'feira', 'hipermercado', 'atacadista', 'walmart', 'big', 'gbarbosa', 'bh supermercados', 'super', 'atacadão', 'sam club', 'hortifruti', 'açougue', 'verdurão'],
      'transporte': ['uber', '99', 'taxi', 'combustível', 'posto', 'gasolina', 'passagem', 'onibus', 'metro'],
      'saúde': ['farmácia', 'drogaria', 'hospital', 'médico', 'dentista', 'consulta', 'exame', 'remedio'],
      'educação': ['escola', 'faculdade', 'curso', 'livro', 'educação', 'universidade', 'material'],
      'lazer': ['cinema', 'teatro', 'parque', 'show', 'evento', 'diversão', 'passeio', 'viagem'],
      'tecnologia': ['google', 'apple', 'microsoft', 'amazon', 'software', 'app', 'celular', 'computador'],
      'assinaturas': ['netflix', 'spotify', 'amazon prime', 'disney+', 'assinatura', 'mensalidade'],
      'casa': ['aluguel', 'condomínio', 'luz', 'água', 'gás', 'internet', 'telefone', 'energia', 'conta'],
      'roupas': ['roupa', 'calçado', 'sapato', 'tênis', 'camisa', 'vestido', 'blusa', 'calça'],
      'investimentos': ['aplicação', 'investimento', 'tesouro', 'ações', 'fundo', 'poupança'],
      'impostos': ['imposto', 'iptu', 'ipva', 'ir', 'taxa', 'governo'],
      'cartão de crédito': ['fatura', 'cartão', 'crédito', 'mastercard', 'visa'],
      'transferência': ['pix', 'ted', 'doc', 'transferência', 'envio'],
      'serviços': ['banco', 'tarifa', 'serviço', 'manutenção', 'reparo'],
      'outros': []
    },
    // Receitas
    INCOME: {
      'salário': ['salário', 'salario', 'ordenado', 'pagamento', 'trabalho', 'empresa'],
      'freelance': ['freelance', 'freela', 'trabalho extra', 'projeto', 'consultoria'],
      'vendas': ['venda', 'vendas', 'mercado livre', 'produto', 'cliente'],
      'investimentos': ['rendimento', 'dividendos', 'juros', 'aplicação', 'lucro', 'ganho'],
      'benefícios': ['fgts', 'pis', 'auxílio', 'benefício', 'governo', 'seguro'],
      'aposentadoria': ['aposentadoria', 'pensão', 'inss', 'previdência'],
      'transferência': ['pix', 'ted', 'doc', 'transferência', 'recebimento'],
      'outros': []
    }
  };
  
  const mappings = categoryMappings[type];
  let bestMatch: CategorySuggestion = {
    name: type === 'EXPENSE' ? 'Outros' : 'Outros',
    type,
    color: '#6B7280',
    confidence: 0.5 // Confiança mais alta para garantir sugestão
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
  if (keywords.length === 0) return 0.5; // Confiança padrão para "outros"
  
  let matches = 0;
  let totalScore = 0;
  let partialMatches = 0;
  
  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase();
    
    // Match exato (pontuação completa)
    if (description.includes(keywordLower)) {
      matches++;
      totalScore += Math.min(keyword.length / 3, 3.0); // Pontuação aumentada para matches exatos
    }
    // Match parcial (palavra contém ou é contida)
    else {
      // Verifica se alguma palavra da descrição contém a keyword ou vice-versa
      const descWords = description.split(/\s+/);
      for (const word of descWords) {
        if (word.length >= 3 && keywordLower.length >= 3) {
          // Palavra da descrição contém keyword (ex: "supermercados" contém "mercado")
          if (word.includes(keywordLower) || keywordLower.includes(word)) {
            partialMatches++;
            totalScore += Math.min(keyword.length / 6, 1.5); // Metade da pontuação para matches parciais
            break;
          }
          // Similaridade por início de palavra (ex: "super" matches "supermercado")
          if (word.startsWith(keywordLower.substring(0, Math.min(4, keywordLower.length))) ||
              keywordLower.startsWith(word.substring(0, Math.min(4, word.length)))) {
            partialMatches++;
            totalScore += Math.min(keyword.length / 8, 1.0); // Pontuação menor para matches de prefixo
            break;
          }
        }
      }
    }
  }
  
  const totalMatches = matches + (partialMatches * 0.5); // Matches parciais valem metade
  
  if (totalMatches === 0) return 0.3; // Confiança mínima mais alta
  
  // Fórmula melhorada: prioriza matches exatos, mas considera parciais
  const matchRatio = totalMatches / Math.min(keywords.length, 8); // Permite mais palavras-chave
  const scoreBonus = totalScore / Math.max(totalMatches, 1);
  const confidence = Math.min(matchRatio * 0.6 + scoreBonus * 0.4 + 0.2, 1.0);
  
  return Math.max(confidence, 0.3);
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

export interface SmartSuggestion {
  type: 'category' | 'tag';
  name: string;
  confidence: number;
  isNew: boolean;
  color?: string;
  icon?: string;
}

export interface FormSuggestions {
  category?: SmartSuggestion;
  tags: SmartSuggestion[];
  confidence: number;
}

/**
 * Analisa uma descrição em tempo real e sugere categoria e tags para formulários
 */
export async function analyzeFormDescription(
  description: string,
  transactionType: 'EXPENSE' | 'INCOME',
  existingCategories: Array<{ id: string; name: string; type: string }>,
  existingTags: Array<{ id: string; name: string }>
): Promise<FormSuggestions> {
  if (!description || description.trim().length < 3) {
    return { tags: [], confidence: 0 };
  }

  const normalizedDesc = normalizeDescription(description);
  const merchantInfo = extractMerchantInfo(normalizedDesc);
  const enhancedDescription = enhanceDescription(normalizedDesc, merchantInfo);

  // Sugere categoria
  const categorySuggestion = suggestCategoryFromDescription(
    enhancedDescription,
    transactionType,
    existingCategories
  );

  // Verifica se a categoria existe
  const existingCategory = existingCategories.find(
    cat => cat.name.toLowerCase() === categorySuggestion.name.toLowerCase() && 
    (cat.type === transactionType || cat.type === 'BOTH')
  );

  // Sempre sugere uma categoria se houver confiança suficiente
  const categoryResult: SmartSuggestion | undefined = categorySuggestion.confidence > 0.3 ? {
    type: 'category',
    name: categorySuggestion.name,
    confidence: Math.max(categorySuggestion.confidence, 0.4), // Garante confiança mínima
    isNew: !existingCategory, // True se precisa criar, false se já existe
    color: categorySuggestion.color,
    icon: categorySuggestion.icon
  } : undefined;

  // Sugere tags baseadas na descrição
  const suggestedTagNames = generateSmartTags(enhancedDescription, merchantInfo);
  const tagSuggestions: SmartSuggestion[] = [];

  for (const tagName of suggestedTagNames) {
    const existingTag = existingTags.find(
      tag => tag.name.toLowerCase() === tagName.toLowerCase()
    );

    tagSuggestions.push({
      type: 'tag',
      name: tagName,
      confidence: 0.8,
      isNew: !existingTag
    });
  }

  // Calcula confiança geral
  const overallConfidence = Math.max(
    categorySuggestion.confidence,
    tagSuggestions.length > 0 ? 0.7 : 0
  );

  return {
    category: categoryResult,
    tags: tagSuggestions,
    confidence: overallConfidence
  };
}

/**
 * Gera tags inteligentes baseadas na descrição
 */
function generateSmartTags(description: string, merchantInfo: any): string[] {
  const tags: string[] = [];
  const desc = description.toLowerCase();

  // Tags baseadas em padrões de comportamento
  const tagPatterns = {
    // Localização
    'online': /online|internet|web|digital/i,
    'presencial': /loja|balcão|presencial|físico/i,
    
    // Frequência  
    'recorrente': /mensal|anual|assinatura|recorrente|todo mês/i,
    'eventual': /única vez|esporádico|eventual/i,
    
    // Método de pagamento
    'cartão': /cartão|card|débito|crédito/i,
    'pix': /pix/i,
    'dinheiro': /dinheiro|espécie|cash/i,
    'boleto': /boleto|bancário/i,
    
    // Características específicas
    'urgente': /urgente|emergência|emergencial/i,
    'planejado': /planejado|programado|agendado/i,
    'promocional': /promoção|desconto|oferta|promo/i,
    'parcelado': /parcel|prestação|dividido/i,
    
    // Contexto temporal
    'fim-de-semana': /sábado|domingo|fim de semana|weekend/i,
    'feriado': /feriado|natal|ano novo|páscoa/i,
    
    // Essencial vs não essencial
    'essencial': /água|luz|energia|gás|aluguel|medicamento|saúde/i,
    'lazer': /cinema|teatro|jogo|diversão|entretenimento|festa/i,
    
    // Tamanho/valor
    'alto-valor': merchantInfo?.category_hint === 'Investimentos' || desc.includes('investimento'),
    'pequeno-gasto': false // será calculado baseado no valor se disponível
  };

  // Verifica cada padrão
  for (const [tag, pattern] of Object.entries(tagPatterns)) {
    if (typeof pattern === 'boolean' && pattern) {
      tags.push(tag);
    } else if (pattern instanceof RegExp && pattern.test(description)) {
      tags.push(tag);
    }
  }

  // Tags baseadas no merchant/categoria
  if (merchantInfo?.merchant) {
    const merchant = merchantInfo.merchant.toLowerCase();
    
    // Tags específicas por tipo de estabelecimento
    if (['uber', '99', 'taxi'].some(t => merchant.includes(t))) {
      tags.push('transporte-app');
    }
    
    if (['ifood', 'delivery', 'entrega'].some(t => merchant.includes(t))) {
      tags.push('delivery');
    }
    
    if (['netflix', 'spotify', 'amazon-prime'].some(t => merchant.includes(t))) {
      tags.push('streaming');
    }
    
    if (['mercado', 'supermercado', 'açougue', 'padaria'].some(t => merchant.includes(t))) {
      tags.push('compras-casa');
    }
  }

  // Limita a 3-4 tags para não poluir
  return tags.slice(0, 4);
}