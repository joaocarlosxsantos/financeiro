/**
 * Componentes Otimizados para Performance
 * Lazy loading, memoização e virtual scrolling
 */

import React, { 
  memo, 
  useMemo, 
  useCallback, 
  useState, 
  useEffect, 
  useRef,
  Suspense 
} from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// ============ LAZY LOADING COMPONENTS ============

/**
 * Wrapper para lazy loading de componentes pesados
 */
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export const LazyWrapper = memo(({ children, fallback, className }: LazyWrapperProps) => (
  <Suspense fallback={fallback || <div className={cn("animate-pulse bg-muted h-32 rounded-lg", className)} />}>
    {children}
  </Suspense>
));

LazyWrapper.displayName = 'LazyWrapper';

// ============ INTERSECTION OBSERVER ============

/**
 * Hook para detectar quando elemento entra na viewport
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [React.RefObject<HTMLDivElement>, boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      {
        threshold: 0.1,
        ...options
      }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [options]);

  return [ref, isIntersecting];
}

/**
 * Componente que renderiza apenas quando visível
 */
interface LazyRenderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
  rootMargin?: string;
}

export const LazyRender = memo(({ children, fallback, className, rootMargin = '100px' }: LazyRenderProps) => {
  const [ref, isIntersecting] = useIntersectionObserver({ rootMargin });

  return (
    <div ref={ref} className={className}>
      {isIntersecting ? children : fallback}
    </div>
  );
});

LazyRender.displayName = 'LazyRender';

// ============ VIRTUAL SCROLLING ============

interface VirtualScrollProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
}

export function VirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className
}: VirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index
    }));
  }, [items, startIndex, endIndex]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={scrollElementRef}
      className={cn("overflow-auto", className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: index * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ PERFORMANCE COMPONENTS ============

/**
 * Wrapper que só re-renderiza quando props específicas mudam
 */
interface MemoizedWrapperProps {
  children: React.ReactNode;
  deps: any[];
  className?: string;
}

export const MemoizedWrapper = memo(
  ({ children, className }: Omit<MemoizedWrapperProps, 'deps'>) => (
    <div className={className}>{children}</div>
  ),
  (prevProps, nextProps) => {
    // Comparação shallow das props
    return (
      prevProps.children === nextProps.children &&
      prevProps.className === nextProps.className
    );
  }
);

MemoizedWrapper.displayName = 'MemoizedWrapper';

/**
 * Hook para debounce de valores
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook para throttle de funções
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCall = useRef(0);
  
  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall.current >= delay) {
        lastCall.current = now;
        return callback(...args);
      }
    },
    [callback, delay]
  );
  
  return throttledCallback as T;
}

// ============ IMAGE OPTIMIZATION ============

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholder?: 'blur' | 'empty';
  loading?: 'lazy' | 'eager';
}

export const OptimizedImage = memo(({
  src,
  alt,
  width = 200,
  height = 200,
  className,
  placeholder = 'blur',
  loading = 'lazy'
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {!isLoaded && placeholder === 'blur' && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        className={cn(
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
          error && "hidden"
        )}
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
      />
      {error && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center text-muted-foreground text-sm">
          Erro ao carregar imagem
        </div>
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// ============ LIST OPTIMIZATION ============

interface OptimizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  className?: string;
  itemClassName?: string;
  emptyMessage?: string;
  loadingCount?: number;
  isLoading?: boolean;
}

export function OptimizedList<T>({
  items,
  renderItem,
  keyExtractor,
  className,
  itemClassName,
  emptyMessage = "Nenhum item encontrado",
  loadingCount = 3,
  isLoading = false
}: OptimizedListProps<T>) {
  const memoizedItems = useMemo(() => {
    return items.map((item, index) => ({
      key: keyExtractor(item, index),
      content: renderItem(item, index)
    }));
  }, [items, renderItem, keyExtractor]);

  if (isLoading) {
    return (
      <div className={className}>
        {Array.from({ length: loadingCount }, (_, i) => (
          <div
            key={i}
            className={cn(
              "animate-pulse bg-muted h-16 rounded-lg mb-2",
              itemClassName
            )}
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={className}>
      {memoizedItems.map(({ key, content }) => (
        <div key={key} className={itemClassName}>
          {content}
        </div>
      ))}
    </div>
  );
}

// ============ SKELETON LOADERS ============

export const SkeletonCard = memo(({ className }: { className?: string }) => (
  <div className={cn("p-4 border rounded-lg space-y-3", className)}>
    <div className="h-4 bg-muted rounded animate-pulse" />
    <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
    <div className="h-8 bg-muted rounded animate-pulse w-1/2" />
  </div>
));

SkeletonCard.displayName = 'SkeletonCard';

export const SkeletonTable = memo(({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="flex space-x-4">
        {Array.from({ length: cols }, (_, j) => (
          <div key={j} className="flex-1 h-8 bg-muted rounded animate-pulse" />
        ))}
      </div>
    ))}
  </div>
));

SkeletonTable.displayName = 'SkeletonTable';

// ============ EXPORT ALL ============

export const PerformanceComponents = {
  LazyWrapper,
  LazyRender,
  VirtualScroll,
  MemoizedWrapper,
  OptimizedImage,
  OptimizedList,
  SkeletonCard,
  SkeletonTable
};

export const PerformanceHooks = {
  useIntersectionObserver,
  useDebounce,
  useThrottle
};