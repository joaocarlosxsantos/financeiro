/**
 * Sistema de Auto-Categorização Inteligente
 * 
 * Este módulo implementa um sistema de aprendizado baseado no histórico
 * de transações do usuário para categorizar automaticamente novos registros.
 * 
 * Funcionalidades:
 * - Analisa histórico de transações para criar mapeamentos descrição -> categoria/tags
 * - Normaliza descrições para melhor matching (remove números, datas, códigos)
 * - Usa similaridade de texto para encontrar transações recorrentes
 * - Prioriza categorias mais recentes e frequentes
 */

import { normalizeDescription } from './description-normalizer';

export interface HistoricalTransaction {
  id: string;
  description: string;
  categoryId?: string | null;
  categoryName?: string | null;
  tags: string[];
  amount: number;
  date: Date;
  type: 'INCOME' | 'EXPENSE';
}

export interface CategorySuggestion {
  categoryId?: string;
  categoryName?: string;
  tags: string[];
  confidence: number; // 0-100
  matchReason: 'exact' | 'high_similarity' | 'partial' | 'merchant' | 'keyword' | 'none';
  matchedTransaction?: {
    id: string;
    description: string;
    similarity: number;
  };
}

interface NormalizedMapping {
  normalizedDescription: string;
  originalDescription: string;
  categoryId?: string;
  categoryName?: string;
  tags: string[];
  frequency: number;
  lastUsed: Date;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
}

/**
 * Normaliza descrição para matching
 * Remove números longos, datas, códigos e mantém apenas palavras-chave
 */
function normalizeForMatching(description: string): string {
  if (!description) return '';
  
  let normalized = description.toLowerCase().trim();
  
  // Remove números longos (mais de 4 dígitos consecutivos)
  normalized = normalized.replace(/\b\d{5,}\b/g, '');
  
  // Remove datas
  normalized = normalized.replace(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g, '');
  
  // Remove códigos comuns (PIX ID, NSU, etc)
  normalized = normalized.replace(/pix\s*-?\s*[a-z0-9]{8,}/gi, 'pix');
  normalized = normalized.replace(/\b(nsu|id|doc|aut|codigo|terminal)\s*[a-z0-9]{6,}/gi, '');
  
  // Remove valores monetários
  normalized = normalized.replace(/r\$\s*[\d.,]+/gi, '');
  
  // Remove caracteres especiais exceto espaços e hífens importantes
  normalized = normalized.replace(/[^\w\sáàâãéèêíïóôõöúçñ-]/g, ' ');
  
  // Remove acentos para matching
  normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Remove palavras muito comuns que não ajudam no matching
  const stopWords = ['de', 'da', 'do', 'em', 'no', 'na', 'para', 'com', 'por', 'ao', 'aos', 'das', 'dos'];
  const words = normalized.split(/\s+/).filter(w => w.length > 0 && !stopWords.includes(w));
  
  // Remove espaços múltiplos
  normalized = words.join(' ').trim();
  
  return normalized;
}

/**
 * Calcula similaridade entre duas strings (0-100)
 * Usa algoritmo de Jaccard (conjunto de palavras)
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 100;
  
  const words1 = new Set(str1.split(/\s+/).filter(w => w.length > 0));
  const words2 = new Set(str2.split(/\s+/).filter(w => w.length > 0));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  // Interseção
  const words1Array = Array.from(words1);
  const intersection = new Set(words1Array.filter(w => words2.has(w)));
  
  // União
  const union = new Set([...words1Array, ...Array.from(words2)]);
  
  // Índice de Jaccard
  const jaccard = intersection.size / union.size;
  
  return Math.round(jaccard * 100);
}

/**
 * Extrai palavras-chave mais importantes da descrição
 */
function extractKeywords(description: string): string[] {
  const normalized = normalizeForMatching(description);
  const words = normalized.split(/\s+/).filter(w => w.length > 2);
  
  // Retorna primeiras 3-5 palavras mais longas (mais específicas)
  return words
    .sort((a, b) => b.length - a.length)
    .slice(0, 5);
}

/**
 * Extrai possível nome de estabelecimento comercial da descrição
 * Estabelecimentos geralmente aparecem no início da descrição
 */
function extractMerchantName(description: string): string {
  // Normaliza mas mantém estrutura
  const normalized = description
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  // Remove prefixos comuns de cartão
  const cleaned = normalized
    .replace(/^(compra\s+)?parcelado\s+/i, '')
    .replace(/^parc\s+\d+\/\d+\s+/i, '')
    .replace(/^(compra\s+)?debito\s+/i, '')
    .replace(/^(compra\s+)?credito\s+/i, '')
    .trim();
  
  // Pega primeiras 2-3 palavras (geralmente o nome do estabelecimento)
  const words = cleaned.split(/\s+/).filter(w => w.length > 2);
  return words.slice(0, 3).join(' ');
}

/**
 * Constrói um mapa de aprendizado a partir do histórico de transações
 */
export function buildLearningMap(history: HistoricalTransaction[]): NormalizedMapping[] {
  const mappings: Map<string, NormalizedMapping> = new Map();
  
  for (const transaction of history) {
    // Só processa transações que têm categoria
    if (!transaction.categoryId && !transaction.categoryName) continue;
    
    const normalized = normalizeForMatching(transaction.description);
    if (!normalized) continue;
    
    const key = `${normalized}|${transaction.type}`;
    const existing = mappings.get(key);
    
    if (existing) {
      // Atualiza frequência e última utilização
      existing.frequency++;
      if (transaction.date > existing.lastUsed) {
        existing.lastUsed = transaction.date;
        existing.originalDescription = transaction.description;
      }
      // Adiciona tags que não existem
      for (const tag of transaction.tags) {
        if (!existing.tags.includes(tag)) {
          existing.tags.push(tag);
        }
      }
    } else {
      // Cria novo mapeamento
      mappings.set(key, {
        normalizedDescription: normalized,
        originalDescription: transaction.description,
        categoryId: transaction.categoryId || undefined,
        categoryName: transaction.categoryName || undefined,
        tags: [...transaction.tags],
        frequency: 1,
        lastUsed: transaction.date,
        amount: transaction.amount,
        type: transaction.type,
      });
    }
  }
  
  return Array.from(mappings.values());
}

/**
 * Sugere categoria e tags para uma nova transação baseado no histórico
 */
export function suggestFromHistory(
  description: string,
  amount: number,
  type: 'INCOME' | 'EXPENSE',
  learningMap: NormalizedMapping[]
): CategorySuggestion {
  if (!description || learningMap.length === 0) {
    return {
      tags: [],
      confidence: 0,
      matchReason: 'none',
    };
  }
  
  const normalized = normalizeForMatching(description);
  if (!normalized) {
    return {
      tags: [],
      confidence: 0,
      matchReason: 'none',
    };
  }
  
  // Filtra apenas transações do mesmo tipo
  const relevantMappings = learningMap.filter(m => m.type === type);
  
  if (relevantMappings.length === 0) {
    return {
      tags: [],
      confidence: 0,
      matchReason: 'none',
    };
  }
  
  // 1. Tenta match exato
  const exactMatch = relevantMappings.find(
    m => m.normalizedDescription === normalized
  );
  
  if (exactMatch) {
    return {
      categoryId: exactMatch.categoryId,
      categoryName: exactMatch.categoryName,
      tags: exactMatch.tags,
      confidence: 95,
      matchReason: 'exact',
      matchedTransaction: {
        id: '',
        description: exactMatch.originalDescription,
        similarity: 100,
      },
    };
  }
  
  // 2. Tenta match por similaridade alta (>80%)
  const similarities = relevantMappings.map(m => ({
    mapping: m,
    similarity: calculateSimilarity(normalized, m.normalizedDescription),
  }));
  
  // Ordena por similaridade (desc) e depois por frequência e data
  similarities.sort((a, b) => {
    if (a.similarity !== b.similarity) {
      return b.similarity - a.similarity;
    }
    // Em caso de empate, prioriza mais frequente
    if (a.mapping.frequency !== b.mapping.frequency) {
      return b.mapping.frequency - a.mapping.frequency;
    }
    // Em caso de empate, prioriza mais recente
    return b.mapping.lastUsed.getTime() - a.mapping.lastUsed.getTime();
  });
  
  const bestMatch = similarities[0];
  
  // 2. Match com similaridade alta (>75%, reduzido de 80%)
  if (bestMatch && bestMatch.similarity >= 75) {
    return {
      categoryId: bestMatch.mapping.categoryId,
      categoryName: bestMatch.mapping.categoryName,
      tags: bestMatch.mapping.tags,
      confidence: Math.round(bestMatch.similarity * 0.95), // Menos desconto
      matchReason: 'high_similarity',
      matchedTransaction: {
        id: '',
        description: bestMatch.mapping.originalDescription,
        similarity: bestMatch.similarity,
      },
    };
  }
  
  // 3. Match parcial (50-74%, reduzido de 60-79%)
  if (bestMatch && bestMatch.similarity >= 50) {
    return {
      categoryId: bestMatch.mapping.categoryId,
      categoryName: bestMatch.mapping.categoryName,
      tags: bestMatch.mapping.tags,
      confidence: Math.round(bestMatch.similarity * 0.75), // Menos desconto
      matchReason: 'partial',
      matchedTransaction: {
        id: '',
        description: bestMatch.mapping.originalDescription,
        similarity: bestMatch.similarity,
      },
    };
  }
  
  // 4. Tenta match por nome de estabelecimento
  const merchantName = extractMerchantName(description);
  if (merchantName && merchantName.length > 3) {
    const merchantMatches = relevantMappings.filter(m => {
      const mappingMerchant = extractMerchantName(m.originalDescription);
      return mappingMerchant && merchantName.includes(mappingMerchant);
    });
    
    if (merchantMatches.length > 0) {
      // Ordena por frequência e data
      merchantMatches.sort((a, b) => {
        if (a.frequency !== b.frequency) {
          return b.frequency - a.frequency;
        }
        return b.lastUsed.getTime() - a.lastUsed.getTime();
      });
      
      const merchantMatch = merchantMatches[0];
      return {
        categoryId: merchantMatch.categoryId,
        categoryName: merchantMatch.categoryName,
        tags: merchantMatch.tags,
        confidence: 55 + (merchantMatch.frequency * 5), // Base 55% + bônus por frequência
        matchReason: 'merchant',
        matchedTransaction: {
          id: '',
          description: merchantMatch.originalDescription,
          similarity: 70,
        },
      };
    }
  }
  
  // 5. Tenta match por palavra-chave
  const keywords = extractKeywords(description);
  const keywordMatches = relevantMappings.filter(m => {
    const mappingKeywords = extractKeywords(m.originalDescription);
    return keywords.some(k => mappingKeywords.includes(k));
  });
  
  if (keywordMatches.length > 0) {
    // Ordena por frequência e data
    keywordMatches.sort((a, b) => {
      if (a.frequency !== b.frequency) {
        return b.frequency - a.frequency;
      }
      return b.lastUsed.getTime() - a.lastUsed.getTime();
    });
    
    const keywordMatch = keywordMatches[0];
    return {
      categoryId: keywordMatch.categoryId,
      categoryName: keywordMatch.categoryName,
      tags: keywordMatch.tags,
      confidence: 45 + (keywordMatch.frequency * 5), // Base 45% + bônus por frequência (reduzido de 40)
      matchReason: 'keyword',
      matchedTransaction: {
        id: '',
        description: keywordMatch.originalDescription,
        similarity: 50,
      },
    };
  }
  
  // Nenhum match encontrado
  return {
    tags: [],
    confidence: 0,
    matchReason: 'none',
  };
}

/**
 * Processa múltiplas transações de uma vez
 */
export function suggestBatch(
  transactions: Array<{
    description: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
  }>,
  learningMap: NormalizedMapping[]
): CategorySuggestion[] {
  return transactions.map(t => 
    suggestFromHistory(t.description, t.amount, t.type, learningMap)
  );
}

/**
 * Estatísticas do histórico de aprendizado
 */
export function getHistoryStats(history: HistoricalTransaction[]) {
  const totalTransactions = history.length;
  const categorized = history.filter(t => t.categoryId || t.categoryName).length;
  const withTags = history.filter(t => t.tags.length > 0).length;
  
  const categoryFrequency = new Map<string, number>();
  const tagFrequency = new Map<string, number>();
  
  for (const transaction of history) {
    if (transaction.categoryName) {
      categoryFrequency.set(
        transaction.categoryName,
        (categoryFrequency.get(transaction.categoryName) || 0) + 1
      );
    }
    
    for (const tag of transaction.tags) {
      tagFrequency.set(tag, (tagFrequency.get(tag) || 0) + 1);
    }
  }
  
  return {
    totalTransactions,
    categorized,
    withTags,
    categorizationRate: totalTransactions > 0 ? (categorized / totalTransactions) * 100 : 0,
    topCategories: Array.from(categoryFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count })),
    topTags: Array.from(tagFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count })),
  };
}
