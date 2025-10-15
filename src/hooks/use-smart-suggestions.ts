import { useState, useEffect, useCallback } from 'react';
import { analyzeFormDescription, SmartSuggestion, FormSuggestions } from '@/lib/ai-categorization';

interface UseSmartSuggestionsProps {
  description: string;
  transactionType: 'EXPENSE' | 'INCOME';
  categories: Array<{ id: string; name: string; type: string }>;
  tags: Array<{ id: string; name: string }>;
  debounceMs?: number;
  onCategoryPreselect?: (categoryId: string) => void;
  onTagsPreselect?: (tagIds: string[]) => void;
}

interface UseSmartSuggestionsReturn {
  suggestions: FormSuggestions | null;
  isLoading: boolean;
  error: string | null;
  acceptCategorySuggestion: () => Promise<string | null>;
  acceptTagSuggestion: (tagName: string) => Promise<string | null>;
  dismissSuggestions: () => void;
  dismissCategorySuggestion: (categoryName: string) => void;
  dismissTagSuggestion: (tagName: string) => void;
}

export function useSmartSuggestions({
  description,
  transactionType,
  categories,
  tags,
  debounceMs = 800,
  onCategoryPreselect,
  onTagsPreselect
}: UseSmartSuggestionsProps): UseSmartSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<FormSuggestions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedCategories, setDismissedCategories] = useState<Set<string>>(new Set());
  const [dismissedTags, setDismissedTags] = useState<Set<string>>(new Set());

  // Debounce para evitar muitas chamadas
  const debouncedAnalyze = useCallback(
    async (desc: string) => {
      if (!desc || desc.trim().length < 3) {
        setSuggestions(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await analyzeFormDescription(
          desc,
          transactionType,
          categories,
          tags
        );

        // Só mostra sugestões se houver confiança suficiente
        if (result.confidence > 0.5) {
          // Filtra categoria dispensada
          const filteredCategory = result.category && !dismissedCategories.has(result.category.name) 
            ? result.category 
            : null;
          
          // Filtra tags dispensadas
          const filteredTags = result.tags.filter(tag => !dismissedTags.has(tag.name));
          
          // Só define sugestões se houver algo para sugerir
          if (filteredCategory || filteredTags.length > 0) {
            setSuggestions({
              ...result,
              category: filteredCategory || undefined,
              tags: filteredTags
            });
            
            // Pré-seleção automática removida - apenas sugerimos visualmente
            // O usuário deve clicar explicitamente em "Aplicar" para aceitar as sugestões
          } else {
            setSuggestions(null);
          }
        } else {
          setSuggestions(null);
        }
      } catch (err) {
        setError('Erro ao analisar descrição');
        console.error('Smart suggestions error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [transactionType, categories, tags, onCategoryPreselect, dismissedCategories, dismissedTags]
  );

  // Reset das sugestões dispensadas quando a descrição muda significativamente
  useEffect(() => {
    setDismissedCategories(new Set());
    setDismissedTags(new Set());
  }, [description]);

  // Hook para debounce da análise
  useEffect(() => {
    const timeout = setTimeout(() => {
      debouncedAnalyze(description);
    }, debounceMs);

    return () => clearTimeout(timeout);
  }, [description, debouncedAnalyze, debounceMs]);



  // Aceita sugestão de categoria
  const acceptCategorySuggestion = useCallback(async (): Promise<string | null> => {
    if (!suggestions?.category?.isNew) {
      // Categoria já existe, retorna o ID
      const existingCategory = categories.find(
        cat => cat.name.toLowerCase() === suggestions?.category?.name.toLowerCase()
      );
      return existingCategory?.id || null;
    }

    // Cria nova categoria
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: suggestions.category.name,
          type: transactionType,
          color: suggestions.category.color,
          icon: suggestions.category.icon
        })
      });

      if (!response.ok) throw new Error('Falha ao criar categoria');

      const newCategory = await response.json();
      return newCategory.id;
    } catch (err) {
      setError('Erro ao criar categoria');
      return null;
    }
  }, [suggestions, categories, transactionType]);

  // Aceita sugestão de tag
  const acceptTagSuggestion = useCallback(async (tagName: string): Promise<string | null> => {
    const tagSuggestion = suggestions?.tags.find(t => t.name === tagName);
    if (!tagSuggestion?.isNew) {
      // Tag já existe, retorna o ID
      const existingTag = tags.find(
        tag => tag.name.toLowerCase() === tagName.toLowerCase()
      );
      return existingTag?.id || null;
    }

    // Cria nova tag
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tagName })
      });

      if (!response.ok) throw new Error('Falha ao criar tag');

      const newTag = await response.json();
      return newTag.id;
    } catch (err) {
      setError('Erro ao criar tag');
      return null;
    }
  }, [suggestions, tags]);

  // Dispensa sugestões
  const dismissSuggestions = useCallback(() => {
    setSuggestions(null);
  }, []);

  // Dispensa categoria específica
  const dismissCategorySuggestion = useCallback((categoryName: string) => {
    setDismissedCategories(prev => {
      const newSet = new Set(prev);
      newSet.add(categoryName);
      return newSet;
    });
    
    // Remove categoria das sugestões atuais
    if (suggestions?.category?.name === categoryName) {
      setSuggestions(prev => prev ? { ...prev, category: undefined } : null);
    }
  }, [suggestions]);

  // Dispensa tag específica
  const dismissTagSuggestion = useCallback((tagName: string) => {
    setDismissedTags(prev => {
      const newSet = new Set(prev);
      newSet.add(tagName);
      return newSet;
    });
    
    // Remove tag das sugestões atuais
    setSuggestions(prev => prev ? {
      ...prev,
      tags: prev.tags.filter(tag => tag.name !== tagName)
    } : null);
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    acceptCategorySuggestion,
    acceptTagSuggestion,
    dismissSuggestions,
    dismissCategorySuggestion,
    dismissTagSuggestion
  };
}

