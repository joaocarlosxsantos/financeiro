/**
 * Sistema de Paginação Cursor-Based
 * Otimizado para performance em grandes datasets
 */

export interface CursorPaginationOptions {
  limit?: number;
  cursor?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: string;
  previousCursor?: string;
  totalCount?: number;
  pageInfo: {
    limit: number;
    cursor?: string;
    orderBy: string;
    orderDirection: 'asc' | 'desc';
  };
}

export interface CursorInfo {
  id: string;
  createdAt: Date;
}

/**
 * Gera cursor a partir de um item
 */
export function generateCursor(item: CursorInfo): string {
  const cursorData = {
    id: item.id,
    timestamp: item.createdAt.getTime()
  };
  return Buffer.from(JSON.stringify(cursorData)).toString('base64');
}

/**
 * Decodifica cursor para obter informações
 */
export function decodeCursor(cursor: string): { id: string; timestamp: number } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Valida parâmetros de paginação
 */
export function validatePaginationParams(options: CursorPaginationOptions): {
  limit: number;
  cursor?: string;
  orderBy: string;
  orderDirection: 'asc' | 'desc';
} {
  const limit = Math.min(Math.max(options.limit || 20, 1), 100); // Entre 1 e 100
  const orderBy = options.orderBy || 'createdAt';
  const orderDirection = options.orderDirection || 'desc';
  
  // Valida cursor se fornecido
  let cursor = options.cursor;
  if (cursor && !decodeCursor(cursor)) {
    cursor = undefined; // Remove cursor inválido
  }

  return {
    limit,
    cursor,
    orderBy,
    orderDirection
  };
}

/**
 * Constrói query Prisma com cursor pagination
 */
export function buildCursorQuery(options: CursorPaginationOptions, baseWhere: any = {}) {
  const { limit, cursor, orderBy, orderDirection } = validatePaginationParams(options);
  
  let whereClause = { ...baseWhere };
  
  // Adiciona condição de cursor se fornecido
  if (cursor) {
    const cursorData = decodeCursor(cursor);
    if (cursorData) {
      const comparison = orderDirection === 'desc' ? 'lt' : 'gt';
      
      // Combina cursor de timestamp e ID para garantir ordem consistente
      whereClause = {
        ...whereClause,
        OR: [
          {
            [orderBy]: {
              [comparison]: new Date(cursorData.timestamp)
            }
          },
          {
            [orderBy]: new Date(cursorData.timestamp),
            id: {
              [comparison]: cursorData.id
            }
          }
        ]
      };
    }
  }

  return {
    where: whereClause,
    orderBy: [
      { [orderBy]: orderDirection },
      { id: orderDirection } // Garantir ordem determinística
    ],
    take: limit + 1 // +1 para detectar se há próxima página
  };
}

/**
 * Processa resultado da query e retorna paginação formatada
 */
export function processPaginationResult<T extends CursorInfo>(
  data: T[],
  options: CursorPaginationOptions,
  totalCount?: number
): PaginationResult<T> {
  const { limit, cursor, orderBy, orderDirection } = validatePaginationParams(options);
  
  const hasNextPage = data.length > limit;
  const resultData = hasNextPage ? data.slice(0, limit) : data;
  
  let nextCursor: string | undefined;
  let previousCursor: string | undefined;
  
  if (hasNextPage && resultData.length > 0) {
    nextCursor = generateCursor(resultData[resultData.length - 1]);
  }
  
  if (cursor && resultData.length > 0) {
    previousCursor = generateCursor(resultData[0]);
  }

  return {
    data: resultData,
    hasNextPage,
    hasPreviousPage: !!cursor,
    nextCursor,
    previousCursor,
    totalCount,
    pageInfo: {
      limit,
      cursor,
      orderBy,
      orderDirection
    }
  };
}

/**
 * Hook React para paginação cursor-based
 */
import { useState, useCallback, useMemo } from 'react';

export interface UseCursorPaginationOptions<T> {
  initialLimit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  fetcher: (options: CursorPaginationOptions) => Promise<PaginationResult<T>>;
  onError?: (error: Error) => void;
}

export function useCursorPagination<T extends CursorInfo>({
  initialLimit = 20,
  orderBy = 'createdAt',
  orderDirection = 'desc',
  fetcher,
  onError
}: UseCursorPaginationOptions<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [previousCursor, setPreviousCursor] = useState<string | undefined>();
  const [totalCount, setTotalCount] = useState<number | undefined>();

  const [paginationOptions, setPaginationOptions] = useState<CursorPaginationOptions>({
    limit: initialLimit,
    orderBy,
    orderDirection
  });

  const loadData = useCallback(async (options: CursorPaginationOptions, append = false) => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetcher(options);
      
      setData(prev => append ? [...prev, ...result.data] : result.data);
      setHasNextPage(result.hasNextPage);
      setHasPreviousPage(result.hasPreviousPage);
      setNextCursor(result.nextCursor);
      setPreviousCursor(result.previousCursor);
      setTotalCount(result.totalCount);
      setPaginationOptions(options);
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [fetcher, onError]);

  const loadMore = useCallback(async () => {
    if (!hasNextPage || loading || !nextCursor) return;
    
    await loadData({
      ...paginationOptions,
      cursor: nextCursor
    }, true);
  }, [hasNextPage, loading, nextCursor, paginationOptions, loadData]);

  const refresh = useCallback(async () => {
    await loadData({
      ...paginationOptions,
      cursor: undefined
    });
  }, [paginationOptions, loadData]);

  const goToNext = useCallback(async () => {
    if (!hasNextPage || loading || !nextCursor) return;
    
    await loadData({
      ...paginationOptions,
      cursor: nextCursor
    });
  }, [hasNextPage, loading, nextCursor, paginationOptions, loadData]);

  const goToPrevious = useCallback(async () => {
    if (!hasPreviousPage || loading || !previousCursor) return;
    
    await loadData({
      ...paginationOptions,
      cursor: previousCursor
    });
  }, [hasPreviousPage, loading, previousCursor, paginationOptions, loadData]);

  const changeLimit = useCallback(async (newLimit: number) => {
    await loadData({
      ...paginationOptions,
      limit: newLimit,
      cursor: undefined
    });
  }, [paginationOptions, loadData]);

  const changeSort = useCallback(async (orderBy: string, orderDirection: 'asc' | 'desc') => {
    await loadData({
      ...paginationOptions,
      orderBy,
      orderDirection,
      cursor: undefined
    });
  }, [paginationOptions, loadData]);

  const stats = useMemo(() => ({
    currentPage: Math.ceil((data.length || 1) / paginationOptions.limit!),
    totalPages: totalCount ? Math.ceil(totalCount / paginationOptions.limit!) : undefined,
    itemsPerPage: paginationOptions.limit,
    totalItems: totalCount,
    currentItems: data.length
  }), [data.length, paginationOptions.limit, totalCount]);

  return {
    // Data
    data,
    loading,
    error,
    
    // Pagination state
    hasNextPage,
    hasPreviousPage,
    nextCursor,
    previousCursor,
    totalCount,
    stats,
    
    // Actions
    loadData,
    loadMore,
    refresh,
    goToNext,
    goToPrevious,
    changeLimit,
    changeSort,
    
    // Current options
    options: paginationOptions
  };
}