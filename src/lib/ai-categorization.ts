/**
 * Serviço de categorização inteligente usando IA
 * Melhora a importação de extratos com análise automática de transações
 *
 * IMPORTANTE: apesar do nome, este módulo é 100% baseado em regras/dicionário
 * (sem chamada a LLM externa). O reconhecimento de estabelecimentos e
 * categorias do dia a dia foi unificado em '@/lib/merchant-dictionary' —
 * a mesma base é usada aqui e nas rotas de importação de extrato/fatura,
 * para não haver mais divergência de cobertura entre os fluxos.
 */
import {
  identifyMerchant,
  suggestCategoryOnly,
  type MerchantMatch,
} from './merchant-dictionary';

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

  // --- AJUSTE: Sugerir categoria PIX para envio a terceiros ---
  let categorySuggestion;
  // Tenta extrair nome de pessoa do PIX
  let nomeExtraido = null;
  try {
    const match = enhancedDescription.match(/PIX\s*\-\s*([\w\s]+)(?:\s*\(Transferência\))?/i);
    if (match && match[1]) {
      nomeExtraido = match[1].trim();
    }
  } catch {}

  // Se for despesa PIX e nome extraído não for vazio, sugere 'PIX' como categoria
  if (!isIncome && nomeExtraido) {
    categorySuggestion = {
      name: 'PIX',
      type: 'EXPENSE',
      color: '#3B82F6',
      icon: '💸',
      confidence: 0.95
    };
  } else {
    // Sugere categoria baseada na descrição melhorada (padrão), aproveitando
    // a categoria já identificada pelo dicionário de estabelecimentos
    // (merchantInfo.category_hint) quando houver, em vez de tentar
    // redescobrir a categoria a partir do texto novamente.
    categorySuggestion = suggestCategoryFromDescription(
      enhancedDescription,
      categoryType,
      existingCategories,
      merchantInfo.category_hint
    );
  }

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
  tags_hint?: string[];
} {
  const desc = description.toLowerCase();

  // Estabelecimentos conhecidos do dia a dia — base unificada em merchant-dictionary.ts
  const merchantMatch: MerchantMatch | null = identifyMerchant(description);
  if (merchantMatch) {
    return {
      merchant: merchantMatch.canonicalName,
      category_hint: merchantMatch.category,
      tags_hint: merchantMatch.tags,
    };
  }

  // PIX - mantém a descrição completa para saber origem/destino
  if (desc.includes('pix')) {
    const pixPatterns = [
      /pix\s+(?:para|enviado|de|recebido)?\s*[-:]?\s*(.+)/i,
      /transferencia\s+pix\s*[-:]?\s*(.+)/i
    ];
    
    for (const pattern of pixPatterns) {
      const match = description.match(pattern);
      if (match) {
        const name = match[1].trim(); // Mantém o nome completo
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
 * Formata nome de pessoa para PIX - extrai o nome da pessoa dos dados
 */
function formatPersonName(name: string): string {
  if (!name) return '';
  
  // Remove asteriscos e aspas
  name = name.replace(/[*"]/g, '').trim();
  
  // Extrai apenas o nome da pessoa, removendo códigos numéricos no início
  // Ex: "00019 91763720 LIVIA ARAUJO" -> "LIVIA ARAUJO"
  const nameMatch = name.match(/(?:\d+\s+)*([a-zA-Z\s]+)$/);
  if (nameMatch) {
    name = nameMatch[1].trim();
  }
  
  // Se não encontrou padrão, usa a string original mas remove números isolados
  if (!nameMatch || name.length < 3) {
    name = name.replace(/^\d+\s+/g, '').trim();
  }
  
  // Capitaliza apenas a primeira letra de cada palavra
  return name
    .split(' ')
    .filter(word => word.length > 0 && !/^\d+$/.test(word)) // Remove palavras vazias e números isolados
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
 * Sugere categoria baseada na descrição.
 *
 * Ordem de prioridade:
 * 1. `merchantCategoryHint` — categoria já identificada pelo dicionário de
 *    estabelecimentos (merchant-dictionary.ts) via extractMerchantInfo,
 *    quando o chamador já a tiver descoberto (evita reprocessar o texto).
 * 2. `suggestCategoryOnly` (merchant-dictionary.ts) — buckets de palavras-
 *    chave genéricas por categoria (ex: "farmacia" sem citar a marca).
 * 3. "Outros", como antes.
 */
function suggestCategoryFromDescription(
  description: string,
  type: 'EXPENSE' | 'INCOME',
  existingCategories: Array<{ name: string; type: string }>,
  merchantCategoryHint?: string
): CategorySuggestion {
  let bestMatch: CategorySuggestion;

  if (merchantCategoryHint) {
    bestMatch = {
      name: merchantCategoryHint,
      type,
      color: getCategoryColor(merchantCategoryHint),
      icon: getCategoryIcon(merchantCategoryHint),
      confidence: 0.9,
    };
  } else {
    const bucketMatch = suggestCategoryOnly(description, type);
    if (bucketMatch) {
      bestMatch = {
        name: bucketMatch.category,
        type,
        color: getCategoryColor(bucketMatch.category),
        icon: getCategoryIcon(bucketMatch.category),
        confidence: bucketMatch.confidence,
      };
    } else {
      bestMatch = {
        name: 'Outros',
        type,
        color: '#6B7280',
        confidence: 0.5, // Confiança mais alta para garantir sugestão
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
 * Sugere tags apenas para casos esporádicos específicos, mais as tags
 * já associadas ao estabelecimento reconhecido pelo merchant-dictionary
 * (ex: "delivery", "streaming", "combustivel").
 */
function suggestTags(description: string, merchantInfo: any): string[] {
  const tags: string[] = [...(merchantInfo?.tags_hint || [])];
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

  // Remove duplicatas e limita para não poluir
  return Array.from(new Set(tags)).slice(0, 4);
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
    'saúde': '#EC4899',
    'assinaturas': '#8B5CF6',
    'casa': '#84CC16',
    'moradia': '#84CC16',
    'contas': '#84CC16',
    'transferência': '#6B7280',
    'compras online': '#F59E0B',
    'compras': '#F59E0B',
    'cartão de crédito': '#F97316',
    'salário': '#10B981',
    'vendas': '#F59E0B',
    'investimentos': '#10B981',
    'benefícios': '#8B5CF6',
    'lazer': '#8B5CF6',
    'academia': '#22C55E',
    'vestuário': '#EC4899',
    'tecnologia': '#3B82F6',
    'educação': '#3B82F6',
    'telefonia': '#3B82F6',
    'pet': '#F59E0B',
    'beleza': '#EC4899',
    'pagamento cartão': '#10B981',
    'estorno': '#10B981',
    'cashback': '#10B981',
    'ajuste': '#6B7280',
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
    'farmácia': '💊',
    'educação': '📚',
    'lazer': '🎬',
    'tecnologia': '💻',
    'assinaturas': '📱',
    'casa': '🏠',
    'moradia': '🏠',
    'contas': '💡',
    'roupas': '👕',
    'vestuário': '👕',
    'investimentos': '💰',
    'impostos': '📋',
    'cartão de crédito': '💳',
    'transferência': '💸',
    'salário': '💼',
    'freelance': '🔨',
    'vendas': '💰',
    'academia': '🏋️',
    'telefonia': '📶',
    'pet': '🐾',
    'beleza': '💅',
    'pagamento cartão': '✅',
    'estorno': '↩️',
    'cashback': '🤑',
    'ajuste': '⚖️',
    'compras': '🛍️',
    'compras online': '🛍️',
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
    existingCategories,
    merchantInfo.category_hint
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