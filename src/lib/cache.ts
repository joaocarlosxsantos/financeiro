/**
 * Sistema de Cache Inteligente
 * Otimizado para notificações, configurações e dados frequentes
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  hits: number;
  lastAccessed: number;
}

interface CacheOptions {
  ttl?: number; // Time to live em milliseconds
  maxSize?: number; // Máximo número de entradas
  cleanupInterval?: number; // Intervalo de limpeza em ms
}

class IntelligentCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly ttl: number;
  private readonly maxSize: number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl || 5 * 60 * 1000; // 5 minutos padrão
    this.maxSize = options.maxSize || 1000;
    
    // Auto-cleanup a cada 2 minutos
    const cleanupInterval = options.cleanupInterval || 2 * 60 * 1000;
    this.cleanupTimer = setInterval(() => this.cleanup(), cleanupInterval);
  }

  /**
   * Armazena dados no cache
   */
  set(key: string, data: T, customTtl?: number): void {
    const now = Date.now();
    const ttl = customTtl || this.ttl;
    
    // Remove item mais antigo se cache está cheio
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUsed();
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      hits: 0,
      lastAccessed: now
    });
  }

  /**
   * Recupera dados do cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    
    // Verifica se expirou
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Atualiza estatísticas de acesso
    entry.hits++;
    entry.lastAccessed = now;
    
    return entry.data;
  }

  /**
   * Verifica se uma chave existe no cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Verifica se não expirou
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Remove uma entrada do cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Função para cache com fallback automático
   */
  async getOrSet<K>(
    key: string, 
    fetcher: () => Promise<K>, 
    customTtl?: number
  ): Promise<K> {
    // Tenta pegar do cache primeiro
    const cached = this.get(key) as K;
    if (cached !== null) {
      return cached;
    }

    // Se não encontrou, busca os dados
    try {
      const data = await fetcher();
      this.set(key, data as T, customTtl);
      return data;
    } catch (error) {
      console.error(`Cache fetch error for key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Invalidação inteligente por padrão
   */
  invalidatePattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    
    Array.from(this.cache.keys()).forEach(key => {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    });
    
    return count;
  }

  /**
   * Pré-aquecimento do cache
   */
  async warmup<K>(entries: Array<{ key: string; fetcher: () => Promise<K>; ttl?: number }>): Promise<void> {
    const promises = entries.map(async ({ key, fetcher, ttl }) => {
      try {
        const data = await fetcher();
        this.set(key, data as T, ttl);
      } catch (error) {
        console.warn(`Warmup failed for key "${key}":`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Estatísticas do cache
   */
  getStats(): {
    size: number;
    hitRate: number;
    totalHits: number;
    totalEntries: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    let totalHits = 0;
    let oldestTimestamp = Date.now();
    let newestTimestamp = 0;

    Array.from(this.cache.values()).forEach(entry => {
      totalHits += entry.hits;
      if (entry.timestamp < oldestTimestamp) oldestTimestamp = entry.timestamp;
      if (entry.timestamp > newestTimestamp) newestTimestamp = entry.timestamp;
    });

    return {
      size: this.cache.size,
      hitRate: this.cache.size > 0 ? totalHits / this.cache.size : 0,
      totalHits,
      totalEntries: this.cache.size,
      oldestEntry: oldestTimestamp,
      newestEntry: newestTimestamp
    };
  }

  /**
   * Remove entradas expiradas
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      console.debug(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  /**
   * Remove entrada menos usada (LRU)
   */
  private evictLeastUsed(): void {
    let leastUsedKey = '';
    let leastHits = Infinity;
    let oldestAccess = Date.now();

    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      // Prioriza por menor hits, depois por acesso mais antigo
      if (entry.hits < leastHits || 
          (entry.hits === leastHits && entry.lastAccessed < oldestAccess)) {
        leastUsedKey = key;
        leastHits = entry.hits;
        oldestAccess = entry.lastAccessed;
      }
    });

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
      console.debug(`Cache eviction: removed least used entry "${leastUsedKey}"`);
    }
  }

  /**
   * Cleanup ao destruir
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}

// Instâncias específicas para diferentes tipos de dados
export const notificationCache = new IntelligentCache({
  ttl: 2 * 60 * 1000, // 2 minutos para notificações
  maxSize: 500,
  cleanupInterval: 60 * 1000 // Cleanup a cada minuto
});

export const configCache = new IntelligentCache({
  ttl: 10 * 60 * 1000, // 10 minutos para configurações
  maxSize: 100,
  cleanupInterval: 5 * 60 * 1000
});

export const dataCache = new IntelligentCache({
  ttl: 5 * 60 * 1000, // 5 minutos para dados gerais
  maxSize: 1000,
  cleanupInterval: 2 * 60 * 1000
});

export const dashboardCache = new IntelligentCache({
  ttl: 30 * 1000, // 30 segundos para dashboard (dados mais frequentes)
  maxSize: 200,
  cleanupInterval: 15 * 1000
});

// Cache Keys padronizados
export const CacheKeys = {
  // Notificações
  NOTIFICATIONS: (userId: string) => `notifications:${userId}`,
  NOTIFICATION_SETTINGS: (userId: string) => `notification_settings:${userId}`,
  NOTIFICATION_COUNT: (userId: string) => `notification_count:${userId}`,
  
  // Dashboard
  DASHBOARD_SUMMARY: (userId: string) => `dashboard_summary:${userId}`,
  RECENT_TRANSACTIONS: (userId: string, limit: number) => `recent_transactions:${userId}:${limit}`,
  MONTHLY_STATS: (userId: string, month: string) => `monthly_stats:${userId}:${month}`,
  
  // Configurações
  USER_SETTINGS: (userId: string) => `user_settings:${userId}`,
  WALLETS: (userId: string) => `wallets:${userId}`,
  CATEGORIES: (userId: string) => `categories:${userId}`,
  TAGS: (userId: string) => `tags:${userId}`,
  
  // Relatórios
  REPORT_DATA: (userId: string, filters: string) => `report:${userId}:${filters}`,
  CHART_DATA: (userId: string, type: string, period: string) => `chart:${userId}:${type}:${period}`
} as const;

export { IntelligentCache };