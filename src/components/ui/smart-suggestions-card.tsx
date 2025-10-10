import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, Tag, FolderPlus, X, Check, Loader2 } from 'lucide-react';
import { FormSuggestions } from '@/lib/ai-categorization';

interface SmartSuggestionsCardProps {
  suggestions: FormSuggestions;
  isLoading?: boolean;
  onAcceptCategory?: () => Promise<void>;
  onAcceptTag?: (tagName: string) => Promise<void>;
  onDismiss?: () => void;
  className?: string;
  isPreselected?: boolean;
}

export function SmartSuggestionsCard({
  suggestions,
  isLoading = false,
  onAcceptCategory,
  onAcceptTag,
  onDismiss,
  className = "",
  isPreselected = false
}: SmartSuggestionsCardProps) {
  const [acceptingCategory, setAcceptingCategory] = React.useState(false);
  const [acceptingTags, setAcceptingTags] = React.useState<Set<string>>(new Set());

  const handleAcceptCategory = async () => {
    if (!onAcceptCategory || !suggestions.category) return;
    
    setAcceptingCategory(true);
    try {
      await onAcceptCategory();
    } finally {
      setAcceptingCategory(false);
    }
  };

  const handleAcceptTag = async (tagName: string) => {
    if (!onAcceptTag) return;
    
    setAcceptingTags(prev => {
      const newSet = new Set(prev);
      newSet.add(tagName);
      return newSet;
    });
    try {
      await onAcceptTag(tagName);
    } finally {
      setAcceptingTags(prev => {
        const newSet = new Set(prev);
        newSet.delete(tagName);
        return newSet;
      });
    }
  };

  return (
    <Card className={`border-primary/20 bg-primary/5 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {isPreselected ? 'Pré-selecionado pela IA' : 'Sugestões IA'}
            </span>
            {isLoading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-6 w-6 p-0 hover:bg-primary/10"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {/* Sugestão de Categoria */}
          {suggestions.category && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Categoria</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className="bg-background/50"
                    style={{ 
                      borderColor: suggestions.category.color,
                      color: suggestions.category.color 
                    }}
                  >
                    {suggestions.category.icon && (
                      <span className="mr-1">{suggestions.category.icon}</span>
                    )}
                    {suggestions.category.name}
                  </Badge>
                  {suggestions.category.isNew ? (
                    <Badge variant="secondary" className="text-xs px-1 py-0">
                      Nova
                    </Badge>
                  ) : isPreselected ? (
                    <Badge variant="default" className="text-xs px-1 py-0 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      ✓ Aplicada
                    </Badge>
                  ) : null}
                </div>
                
                {onAcceptCategory && (
                  <button
                    type="button"
                    onClick={handleAcceptCategory}
                    disabled={acceptingCategory}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 active:bg-blue-800 transition-all duration-150 font-semibold shadow-sm hover:shadow-md border border-blue-700 hover:border-blue-800 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {acceptingCategory ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Aplicar
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Sugestões de Tags */}
          {suggestions.tags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Tag className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Tags</span>
              </div>
              
              <div className="space-y-2">
                {suggestions.tags.map((tag) => (
                  <div key={tag.name} className="flex items-center justify-between">
                    <Badge 
                      variant="outline" 
                      className="bg-background/50 text-xs"
                    >
                      {tag.name}
                      {tag.isNew ? (
                        <span className="ml-1 text-[10px] opacity-60">nova</span>
                      ) : isPreselected ? (
                        <span className="ml-1 text-[10px] text-green-600 dark:text-green-400">✓</span>
                      ) : null}
                    </Badge>
                    
                    {onAcceptTag && (
                      <button
                        type="button"
                        onClick={() => handleAcceptTag(tag.name)}
                        disabled={acceptingTags.has(tag.name)}
                        className="ml-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 active:bg-blue-800 transition-all duration-150 font-semibold shadow-sm hover:shadow-md border border-blue-700 hover:border-blue-800 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {acceptingTags.has(tag.name) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Aplicar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Indicador de Confiança */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Confiança: {Math.round(suggestions.confidence * 100)}%</span>
            <span className="text-[10px]">Baseado na descrição</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}