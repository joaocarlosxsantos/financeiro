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
  
  // Remove sufixos empresariais e códigos desnecessários
  const noisePattterns = [
    /\s+(ltda|me|eireli|s\.a\.|sa|epp)$/i,
    /\s+\d{4,}$/i, // Remove códigos longos no final
    /\s+(bh|sp|rj|mg|go|df|pr|sc|rs|pe|ba|ce|pb|al|se|pi|ma|ap|ac|ro|rr|am|pa|to)$/i,
    /\s+(centro|shopping|mall|plaza|outlet)$/i,
    /\s+(norte|sul|leste|oeste)$/i
  ];
  
  for (const pattern of noisePattterns) {
    normalized = normalized.replace(pattern, '').trim();
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
  
  // Estabelecimentos conhecidos do dia a dia
  const knownEstablishments = {
    // Transporte
    'uber': 'Transporte',
    '99pop': 'Transporte', 
    '99': 'Transporte',
    'taxi': 'Transporte',
    
    // Delivery de comida
    'ifood': 'Alimentação',
    'uber eats': 'Alimentação',
    'rappi': 'Alimentação',
    
    // Supermercados
    'carrefour': 'Supermercado',
    'pao de acucar': 'Supermercado',
    'extra': 'Supermercado',
    'big': 'Supermercado',
    'atacadao': 'Supermercado',
    'walmart': 'Supermercado',
    'gbarbosa': 'Supermercado',
    
    // Streaming/Assinaturas
    'netflix': 'Assinaturas',
    'spotify': 'Assinaturas',
    'amazon prime': 'Assinaturas',
    'disney': 'Assinaturas',
    'youtube': 'Assinaturas',
    
    // Marketplace
    'mercado livre': 'Compras Online',
    'amazon': 'Compras Online',
    'magazine': 'Compras Online',
    'americanas': 'Compras Online',
    
    // Farmácias
    'drogasil': 'Saúde',
    'pacheco': 'Saúde',
    'raia': 'Saúde',
    'droga raia': 'Saúde',
    'farmacia': 'Saúde',
    'drogaria': 'Saúde'
  };
  
  // Verifica estabelecimentos conhecidos
  for (const [establishment, category] of Object.entries(knownEstablishments)) {
    if (desc.includes(establishment)) {
      return {
        merchant: establishment.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '),
        category_hint: category
      };
    }
  }
  
  // PIX - mantém simples, só o nome da pessoa
  if (desc.includes('pix')) {
    const pixPatterns = [
      /pix\s+(?:para|enviado|de|recebido)?\s*[-:]?\s*([a-zA-Z\s]+)/i,
      /transferencia\s+pix\s*[-:]?\s*([a-zA-Z\s]+)/i
    ];
    
    for (const pattern of pixPatterns) {
      const match = description.match(pattern);
      if (match) {
        const name = match[1].trim().split(' ').slice(0, 2).join(' '); // Máximo 2 palavras
        if (name.length > 2 && !name.includes('*')) {
          return {
            merchant: `PIX - ${formatPersonName(name)}`,
            category_hint: 'Transferência'
          };
        }
      }
    }
    
    return {
      merchant: 'PIX',
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
 * Formata nome de pessoa para PIX
 */
function formatPersonName(name: string): string {
  if (!name) return '';
  
  // Remove caracteres especiais e números
  name = name.replace(/[^a-zA-Z\s]/g, '').trim();
  
  // Capitaliza apenas a primeira letra de cada palavra
  return name
    .split(' ')
    .filter(word => word.length > 1) // Remove palavras muito curtas
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

/**
 * Melhora a descrição da transação - mantém simples e limpa
 */
function enhanceDescription(originalDesc: string, merchantInfo: any): string {
  if (!originalDesc) return 'Transação';
  
  // Se temos informações do comerciante, usa elas (já formatado)
  if (merchantInfo.merchant) {
    return merchantInfo.merchant;
  }
  
  const desc = originalDesc.toLowerCase();
  
  // Apenas melhora casos muito específicos e básicos
  if (desc.includes('saque')) return 'Saque';
  if (desc.includes('deposito')) return 'Depósito';
  if (desc.includes('tarifa')) return 'Tarifa Bancária';
  if (desc.includes('rendimento')) return 'Rendimento';
  if (desc.includes('salario')) return 'Salário';
  if (desc.includes('ted')) return 'TED';
  if (desc.includes('doc')) return 'DOC';
  
  // Caso contrário, retorna a descrição original sem modificações excessivas
  // Remove apenas códigos numéricos longos no final
  let cleaned = originalDesc.replace(/\s+\d{6,}$/g, '').trim();
  
  // Se ficou muito curto, retorna a original
  if (cleaned.length < 3) {
    cleaned = originalDesc;
  }
  
  return cleaned;
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
  
  // Mapeamento simplificado e prático de categorias do dia a dia
  const categoryMappings = {
    // Despesas
    EXPENSE: {
      'supermercado': ['mercado', 'supermercado', 'carrefour', 'extra', 'big', 'atacadao', 'walmart', 'gbarbosa', 'pao de acucar', 'feira', 'hortifruti', 'acougue'],
      'alimentação': ['ifood', 'uber eats', 'rappi', 'restaurante', 'lanchonete', 'bar', 'padaria', 'pizza', 'burguer', 'mcdonald', 'subway', 'bk'],
      'transporte': ['uber', '99', '99pop', 'taxi', 'posto', 'gasolina', 'combustivel', 'shell', 'petrobras', 'ipiranga'],
      'farmácia': ['farmacia', 'drogaria', 'drogasil', 'pacheco', 'raia', 'droga raia', 'remedio'],
      'assinaturas': ['netflix', 'spotify', 'amazon prime', 'disney', 'youtube', 'globoplay', 'paramount'],
      'casa': ['aluguel', 'condominio', 'luz', 'energia', 'cemig', 'copasa', 'agua', 'gas', 'internet', 'vivo', 'claro', 'tim', 'oi'],
      'transferência': ['pix', 'ted', 'doc', 'transferencia'],
      'compras online': ['mercado livre', 'amazon', 'magazine', 'americanas', 'casas bahia', 'extra.com'],
      'cartão de crédito': ['fatura', 'nubank', 'inter', 'itau', 'bradesco', 'santander', 'bb'],
      'outros': []
    },
    // Receitas
    INCOME: {
      'salário': ['salario', 'salário', 'pagamento', 'empresa', 'trabalho'],
      'transferência': ['pix', 'ted', 'doc', 'transferencia', 'recebimento'],
      'vendas': ['venda', 'mercado livre', 'vendas'],
      'investimentos': ['rendimento', 'dividendos', 'juros', 'aplicacao'],
      'benefícios': ['fgts', 'pis', 'auxilio', 'inss'],
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
  if (keywords.length === 0) return 0.4;
  
  const desc = description.toLowerCase();
  let maxScore = 0;
  
  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase();
    
    // Match exato = alta confiança
    if (desc.includes(keywordLower)) {
      maxScore = Math.max(maxScore, 0.9);
    }
  }
  
  // Se não encontrou correspondência, baixa confiança
  return maxScore > 0 ? maxScore : 0.4;
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
 * Sugere tags apenas para casos esporádicos específicos
 */
function suggestTags(description: string, merchantInfo: any): string[] {
  const tags: string[] = [];
  const desc = description.toLowerCase();
  
  // Tags apenas para situações específicas e esporádicas
  if (desc.includes('emergencia') || desc.includes('urgente')) tags.push('Emergência');
  if (desc.includes('viagem') || desc.includes('turismo')) tags.push('Viagem');
  if (desc.includes('presente') || desc.includes('gift')) tags.push('Presente');
  if (desc.includes('desconto') || desc.includes('promocao')) tags.push('Promoção');
  if (desc.includes('parcelado') || desc.includes('parcela')) tags.push('Parcelado');
  if (desc.includes('bonus') || desc.includes('premiacao')) tags.push('Bônus');
  if (desc.includes('reembolso') || desc.includes('devolucao')) tags.push('Reembolso');
  if (desc.includes('multa') || desc.includes('juros')) tags.push('Multa/Juros');
  
  // Máximo 2 tags para não poluir
  return tags.slice(0, 2);
}

/**
 * Retorna cor da categoria
 */
function getCategoryColor(categoryName: string): string {
  const colorMap: Record<string, string> = {
    'supermercado': '#10B981',
    'alimentação': '#EF4444', 
    'transporte': '#3B82F6',
    'farmácia': '#EC4899',
    'assinaturas': '#8B5CF6',
    'casa': '#84CC16',
    'transferência': '#6B7280',
    'compras online': '#F59E0B',
    'cartão de crédito': '#F97316',
    'salário': '#10B981',
    'vendas': '#F59E0B',
    'investimentos': '#10B981',
    'benefícios': '#8B5CF6',
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