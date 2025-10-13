/**
 * Utilitários para integração da cache com componentes React
 * Hooks que utilizam o sistema de cache inteligente
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { IntelligentCache, CacheKeys } from '@/lib/cache';
import { useCursorPagination } from '@/lib/pagination';

// Instâncias de cache (simplificadas para esta implementação)
const cacheInstances = {
  notifications: new IntelligentCache<any>({ maxSize: 1000, ttl: 300000 }),
  data: new IntelligentCache<any>({ maxSize: 5000, ttl: 300000 }),
  config: new IntelligentCache<any>({ maxSize: 100, ttl: 600000 })
};

// Cache keys simplificados
const CACHE_KEYS = {
  NOTIFICATIONS: 'notifications',
  USER_CONFIG: 'user-config',
  DASHBOARD_DATA: 'dashboard-data'
};

// ============ CACHE HOOKS ============

/**
 * Hook para usar cache de dados com invalidação automática
 */
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number;
    dependencies?: any[];
    enabled?: boolean;
  } = {}
) {
  const { ttl = 5 * 60 * 1000, dependencies = [], enabled = true } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      setError(null);

      // Tentar buscar do cache primeiro
      const cached = cacheInstances.data.get(key);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }

      // Buscar dados frescos
      const freshData = await fetcher();
      
      // Salvar no cache
      cacheInstances.data.set(key, freshData, ttl);
      
      setData(freshData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, ttl, enabled]);

  // Refetch quando dependências mudarem
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, JSON.stringify(dependencies)]);

  const refetch = useCallback(() => {
    // Invalidar cache e buscar novamente
    cacheInstances.data.delete(key);
    fetchData();
  }, [key, fetchData]);

  const mutate = useCallback((newData: T) => {
    // Atualizar cache e estado
    cacheInstances.data.set(key, newData, ttl);
    setData(newData);
  }, [key, ttl]);

  return {
    data,
    loading,
    error,
    refetch,
    mutate
  };
}

/**
 * Hook para cache de notificações
 */
export function useCachedNotifications() {
  return useCachedData(
    CACHE_KEYS.NOTIFICATIONS,
    async () => {
      const response = await fetch('/api/notifications');
      if (!response.ok) throw new Error('Erro ao buscar notificações');
      return response.json();
    },
    { ttl: 30000 } // 30 segundos
  );
}

/**
 * Hook para cache de configurações do usuário
 */
export function useCachedUserConfig() {
  return useCachedData(
    CACHE_KEYS.USER_CONFIG,
    async () => {
      const response = await fetch('/api/user/config');
      if (!response.ok) throw new Error('Erro ao buscar configurações');
      return response.json();
    },
    { ttl: 10 * 60 * 1000 } // 10 minutos
  );
}

/**
 * Hook para cache de dados do dashboard
 */
export function useCachedDashboardData(filters?: any) {
  const filterKey = filters ? JSON.stringify(filters) : '';
  const cacheKey = `${CACHE_KEYS.DASHBOARD_DATA}-${filterKey}`;

  return useCachedData(
    cacheKey,
    async () => {
      const response = await fetch('/api/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters || {})
      });
      if (!response.ok) throw new Error('Erro ao buscar dados do dashboard');
      return response.json();
    },
    { 
      ttl: 2 * 60 * 1000, // 2 minutos
      dependencies: [filters]
    }
  );
}

// ============ CACHE + PAGINATION HOOK ============

/**
 * Hook que combina cache com paginação cursor
 */
export function useCachedPagination<T>(
  baseKey: string,
  fetcher: (cursor?: string, limit?: number) => Promise<{
    items: T[];
    nextCursor?: string;
    hasMore: boolean;
  }>,
  options: {
    limit?: number;
    ttl?: number;
    enabled?: boolean;
  } = {}
) {
  const { limit = 20, ttl = 5 * 60 * 1000, enabled = true } = options;

  // Usar hook de paginação básico
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();

  const loadMore = useCallback(async () => {
    if (!enabled || loading) return;
    
    setLoading(true);
    try {
      const result = await fetcher(cursor, limit);
      setData(result);
      setCursor(result.nextCursor);
    } catch (error) {
      console.error('Erro ao carregar dados paginados:', error);
    } finally {
      setLoading(false);
    }
  }, [fetcher, cursor, limit, enabled, loading]);

  const pagination = {
    data,
    loading,
    cursor,
    loadMore,
    refetch: () => {
      setCursor(undefined);
      setData(null);
      loadMore();
    }
  };

  // Cache para cada página
  const cacheKey = useMemo(() => 
    `${baseKey}-page-${pagination.cursor || 'first'}`, 
    [baseKey, pagination.cursor]
  );

  useEffect(() => {
    if (pagination.data && pagination.data.items.length > 0) {
      // Salvar página atual no cache
      cacheInstances.data.set(cacheKey, pagination.data, ttl);
    }
  }, [cacheKey, pagination.data, ttl]);

  // Tentar carregar do cache primeiro
  useEffect(() => {
    if (enabled && !pagination.loading && !pagination.data) {
      const cached = cacheInstances.data.get(cacheKey);
      if (cached) {
        // Simular carregamento dos dados do cache
        // (isto precisaria ser integrado diretamente no hook de paginação)
      }
    }
  }, [cacheKey, enabled, pagination.loading, pagination.data]);

  return {
    ...pagination,
    invalidateCache: () => {
      // Invalidar todas as páginas do cache
      cacheInstances.data.invalidatePattern(`${baseKey}-page-*`);
    }
  };
}

// ============ CACHE INVALIDATION HOOKS ============

/**
 * Hook para invalidar cache quando dados mudam
 */
export function useCacheInvalidation() {
  const invalidateNotifications = useCallback(() => {
    cacheInstances.notifications.clear();
  }, []);

  const invalidateDashboard = useCallback(() => {
    cacheInstances.data.invalidatePattern(CACHE_KEYS.DASHBOARD_DATA);
  }, []);

  const invalidateUserConfig = useCallback(() => {
    cacheInstances.config.delete(CACHE_KEYS.USER_CONFIG);
  }, []);

  const invalidateAll = useCallback(() => {
    Object.values(cacheInstances).forEach(cache => cache.clear());
  }, []);

  return {
    invalidateNotifications,
    invalidateDashboard,
    invalidateUserConfig,
    invalidateAll
  };
}

// ============ CACHE UTILITY FUNCTIONS ============

/**
 * Função para invalidar cache por padrão
 */
export function invalidateCachePattern(pattern: string) {
  cacheInstances.data.invalidatePattern(pattern);
}

/**
 * Função para limpar todo o cache
 */
export function clearAllCache() {
  Object.values(cacheInstances).forEach(cache => cache.clear());
}

/**
 * Função para obter estatísticas do cache
 */
export function getCacheStats() {
  return {
    notifications: 0, // Implementar quando métodos estiverem disponíveis
    data: 0,
    config: 0
  };
}

// ============ PERFORMANCE MONITORING ============

/**
 * Hook para monitorar performance do cache
 */
export function useCachePerformance() {
  const [stats, setStats] = useState({
    hitRate: 0,
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const newStats = {
        hitRate: 0, // Implementar lógica de hit rate
        totalRequests: 0,
        cacheHits: 0,
        cacheMisses: 0
      };
      setStats(newStats);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return stats;
}

// ============ EXPORTS ============

export const CacheHooks = {
  useCachedData,
  useCachedNotifications,
  useCachedUserConfig,
  useCachedDashboardData,
  useCachedPagination,
  useCacheInvalidation,
  useCachePerformance
};

export const CacheUtils = {
  invalidateCachePattern,
  clearAllCache,
  getCacheStats
};