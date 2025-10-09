/**
 * Componentes Mobile-First para Tabelas e Listas
 * Otimizados para dispositivos móveis com scroll horizontal e cards
 */

import React, { memo, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { ChevronDown, ChevronRight, MoreVertical, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ============ MOBILE TABLE ============

interface Column<T> {
  key: keyof T | string;
  title: string;
  render?: (value: any, item: T, index: number) => React.ReactNode;
  width?: string;
  sortable?: boolean;
  mobileHidden?: boolean; // Esconder em mobile
  mobileOnly?: boolean;   // Mostrar apenas em mobile
}

interface MobileTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T, index: number) => string | number;
  className?: string;
  emptyMessage?: string;
  loading?: boolean;
  loadingRows?: number;
  onRowClick?: (item: T, index: number) => void;
  sortable?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
}

export function MobileTable<T>({
  data,
  columns,
  keyExtractor,
  className,
  emptyMessage = "Nenhum item encontrado",
  loading = false,
  loadingRows = 5,
  onRowClick,
  sortable = false,
  searchable = false,
  searchPlaceholder = "Pesquisar..."
}: MobileTableProps<T>) {
  const isMobile = useIsMobile();
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar colunas baseado no dispositivo
  const visibleColumns = useMemo(() => {
    return columns.filter(col => {
      if (isMobile) {
        return !col.mobileHidden;
      } else {
        return !col.mobileOnly;
      }
    });
  }, [columns, isMobile]);

  // Filtrar e ordenar dados
  const processedData = useMemo(() => {
    let filtered = data;

    // Aplicar busca
    if (searchTerm && searchable) {
      filtered = data.filter(item => {
        return visibleColumns.some(col => {
          const value = item[col.key as keyof T];
          return String(value).toLowerCase().includes(searchTerm.toLowerCase());
        });
      });
    }

    // Aplicar ordenação
    if (sortConfig && sortable) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortConfig.key as keyof T];
        const bValue = b[sortConfig.key as keyof T];
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, sortConfig, visibleColumns, searchable, sortable]);

  const handleSort = (columnKey: string) => {
    if (!sortable) return;
    
    setSortConfig(current => {
      if (current?.key === columnKey) {
        return {
          key: columnKey,
          direction: current.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { key: columnKey, direction: 'asc' };
    });
  };

  // Renderizar como cards no mobile
  if (isMobile) {
    return (
      <div className={cn("space-y-4", className)}>
        {searchable && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: loadingRows }, (_, i) => (
              <div key={i} className="p-4 border rounded-lg space-y-3 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : processedData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-3">
            {processedData.map((item, index) => (
              <MobileTableCard
                key={keyExtractor(item, index)}
                item={item}
                columns={visibleColumns}
                onClick={onRowClick ? () => onRowClick(item, index) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Renderizar como tabela no desktop
  return (
    <div className={cn("space-y-4", className)}>
      {searchable && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                {visibleColumns.map((column) => (
                  <th
                    key={String(column.key)}
                    className={cn(
                      "px-4 py-3 text-left text-sm font-medium",
                      column.sortable && sortable && "cursor-pointer hover:bg-muted/70",
                      column.width && `w-[${column.width}]`
                    )}
                    onClick={() => column.sortable && handleSort(String(column.key))}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.title}</span>
                      {column.sortable && sortable && sortConfig?.key === column.key && (
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            sortConfig.direction === 'desc' && "rotate-180"
                          )}
                        />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: loadingRows }, (_, i) => (
                  <tr key={i}>
                    {visibleColumns.map((column) => (
                      <td key={String(column.key)} className="px-4 py-3">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : processedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                processedData.map((item, index) => (
                  <tr
                    key={keyExtractor(item, index)}
                    className={cn(
                      "border-t hover:bg-muted/30 transition-colors",
                      onRowClick && "cursor-pointer"
                    )}
                    onClick={onRowClick ? () => onRowClick(item, index) : undefined}
                  >
                    {visibleColumns.map((column) => (
                      <td key={String(column.key)} className="px-4 py-3">
                        {column.render
                          ? column.render(item[column.key as keyof T], item, index)
                          : String(item[column.key as keyof T] || '-')
                        }
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============ MOBILE TABLE CARD ============

interface MobileTableCardProps<T> {
  item: T;
  columns: Column<T>[];
  onClick?: () => void;
}

function MobileTableCard<T>({ item, columns, onClick }: MobileTableCardProps<T>) {
  return (
    <div
      className={cn(
        "p-4 border rounded-lg bg-background space-y-3",
        onClick && "cursor-pointer hover:bg-muted/30 active:bg-muted/50",
        "transition-colors duration-200"
      )}
      onClick={onClick}
    >
      {columns.map((column, index) => {
        const value = item[column.key as keyof T];
        const renderedValue = column.render
          ? column.render(value, item, index)
          : String(value || '-');

        return (
          <div key={String(column.key)} className="flex justify-between items-start">
            <span className="text-sm text-muted-foreground font-medium min-w-0 flex-1">
              {column.title}:
            </span>
            <span className="text-sm font-medium text-right ml-3 min-w-0 flex-1">
              {renderedValue}
            </span>
          </div>
        );
      })}
      
      {onClick && (
        <div className="flex justify-end pt-2">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

// ============ MOBILE LIST ============

interface MobileListItemProps {
  title: string;
  subtitle?: string;
  description?: string;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const MobileListItem = memo(({
  title,
  subtitle,
  description,
  leftContent,
  rightContent,
  onClick,
  className
}: MobileListItemProps) => {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        "flex items-center p-4 border-b last:border-b-0",
        onClick && [
          "cursor-pointer hover:bg-muted/30 active:bg-muted/50",
          "transition-colors duration-200"
        ],
        isMobile && [
          "p-4", // Padding otimizado para touch
          "min-h-[60px]" // Altura mínima para touch
        ],
        className
      )}
      onClick={onClick}
    >
      {leftContent && (
        <div className={cn(
          "mr-3 flex-shrink-0",
          isMobile && "mr-4"
        )}>
          {leftContent}
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className={cn(
          "font-medium text-sm truncate",
          isMobile && "text-base"
        )}>
          {title}
        </div>
        
        {subtitle && (
          <div className={cn(
            "text-sm text-muted-foreground truncate mt-1",
            isMobile && "text-base"
          )}>
            {subtitle}
          </div>
        )}
        
        {description && (
          <div className={cn(
            "text-xs text-muted-foreground mt-1 line-clamp-2",
            isMobile && "text-sm"
          )}>
            {description}
          </div>
        )}
      </div>
      
      {rightContent && (
        <div className={cn(
          "ml-3 flex-shrink-0",
          isMobile && "ml-4"
        )}>
          {rightContent}
        </div>
      )}
      
      {onClick && !rightContent && (
        <ChevronRight className={cn(
          "h-4 w-4 text-muted-foreground ml-3",
          isMobile && "h-5 w-5 ml-4"
        )} />
      )}
    </div>
  );
});

MobileListItem.displayName = 'MobileListItem';

// ============ MOBILE EXPANDABLE LIST ITEM ============

interface MobileExpandableListItemProps extends MobileListItemProps {
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export const MobileExpandableListItem = memo(({
  children,
  defaultExpanded = false,
  ...itemProps
}: MobileExpandableListItemProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const isMobile = useIsMobile();

  return (
    <div className="border-b last:border-b-0">
      <MobileListItem
        {...itemProps}
        onClick={() => setExpanded(!expanded)}
        rightContent={
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isMobile && "h-5 w-5",
              expanded && "rotate-180"
            )}
          />
        }
      />
      
      {expanded && (
        <div className={cn(
          "px-4 pb-4 pt-2 bg-muted/30",
          isMobile && "px-4 pb-4"
        )}>
          {children}
        </div>
      )}
    </div>
  );
});

MobileExpandableListItem.displayName = 'MobileExpandableListItem';

// ============ MOBILE ACTION LIST ITEM ============

interface MobileActionListItemProps extends Omit<MobileListItemProps, 'rightContent'> {
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'destructive';
    icon?: React.ReactNode;
  }>;
}

export const MobileActionListItem = memo(({
  actions = [],
  ...itemProps
}: MobileActionListItemProps) => {
  const [showActions, setShowActions] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="relative">
      <MobileListItem
        {...itemProps}
        rightContent={
          actions.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(!showActions);
              }}
              className={cn(
                "h-8 w-8",
                isMobile && "h-10 w-10"
              )}
            >
              <MoreVertical className={cn(
                "h-4 w-4",
                isMobile && "h-5 w-5"
              )} />
            </Button>
          )
        }
      />
      
      {showActions && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowActions(false)}
          />
          <div className={cn(
            "absolute right-4 top-full mt-2 z-20",
            "bg-background border rounded-lg shadow-lg",
            "min-w-[160px]",
            isMobile && "min-w-[180px]"
          )}>
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  action.onClick();
                  setShowActions(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-muted/50",
                  "flex items-center space-x-2",
                  "first:rounded-t-lg last:rounded-b-lg",
                  isMobile && [
                    "px-4 py-3 text-base",
                    "min-h-[48px]" // Altura mínima para touch
                  ],
                  action.variant === 'destructive' && "text-destructive hover:bg-destructive/10"
                )}
              >
                {action.icon && (
                  <span className="flex-shrink-0">
                    {action.icon}
                  </span>
                )}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
});

MobileActionListItem.displayName = 'MobileActionListItem';

// ============ EXPORTS ============

export const MobileTableComponents = {
  MobileTable,
  MobileListItem,
  MobileExpandableListItem,
  MobileActionListItem
};