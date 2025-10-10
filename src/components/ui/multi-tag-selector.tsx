import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Search, Tag as TagIcon } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
}

interface MultiTagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  availableTags?: Tag[];
  placeholder?: string;
  maxTags?: number;
  className?: string;
  disabled?: boolean;
  onCreateTag?: (tagName: string) => Promise<Tag | null>;
}

export function MultiTagSelector({
  selectedTags = [],
  onTagsChange,
  availableTags = [],
  placeholder = "Buscar ou criar tags...",
  maxTags = 10,
  className = "",
  disabled = false,
  onCreateTag
}: MultiTagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [tags, setTags] = useState<Tag[]>(availableTags);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Atualiza tags quando availableTags mudar
  useEffect(() => {
    setTags(availableTags);
  }, [availableTags]);

  // Filtra tags baseado no termo de busca
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredTags(tags.filter(tag => !selectedTags.includes(tag.id)));
    } else {
      const filtered = tags.filter(tag => 
        tag.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !selectedTags.includes(tag.id)
      );
      setFilteredTags(filtered);
    }
  }, [searchTerm, tags, selectedTags]);

  // Fecha dropdown quando clica fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Adiciona tag
  const addTag = (tagId: string) => {
    if (selectedTags.length >= maxTags) return;
    if (!selectedTags.includes(tagId)) {
      onTagsChange([...selectedTags, tagId]);
    }
    setSearchTerm('');
    inputRef.current?.focus();
  };

  // Remove tag
  const removeTag = (tagId: string) => {
    onTagsChange(selectedTags.filter(id => id !== tagId));
  };

  // Cria nova tag
  const createNewTag = async () => {
    if (!searchTerm.trim() || !onCreateTag || isCreating) return;
    
    // Verifica se já existe
    const existingTag = tags.find(tag => 
      tag.name.toLowerCase() === searchTerm.trim().toLowerCase()
    );
    if (existingTag) {
      addTag(existingTag.id);
      return;
    }

    setIsCreating(true);
    try {
      const newTag = await onCreateTag(searchTerm.trim());
      if (newTag) {
        setTags(prev => [...prev, newTag]);
        addTag(newTag.id);
      }
    } catch (error) {
      console.error('Erro ao criar tag:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Obtém o nome da tag pelo ID
  const getTagName = (tagId: string) => {
    const tag = tags.find(t => t.id === tagId);
    return tag?.name || tagId;
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTags.length === 1) {
        addTag(filteredTags[0].id);
      } else if (searchTerm.trim() && onCreateTag) {
        createNewTag();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    } else if (e.key === 'Backspace' && !searchTerm && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    }
  };

  const canCreateTag = searchTerm.trim() && 
    !tags.some(tag => tag.name.toLowerCase() === searchTerm.trim().toLowerCase()) &&
    onCreateTag;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Tags Selecionadas */}
      <div className="min-h-[42px] border border-input rounded-md p-2 bg-background focus-within:border-ring focus-within:ring-1 focus-within:ring-ring transition-colors">
        <div className="flex flex-wrap gap-1 items-center">
          {selectedTags.map(tagId => (
            <Badge
              key={tagId}
              variant="secondary"
              className="flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/20 dark:text-primary-foreground dark:hover:bg-primary/30 border border-primary/20 transition-colors"
            >
              <TagIcon className="w-3 h-3" />
              {getTagName(tagId)}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(tagId)}
                  className="ml-1 hover:bg-primary/30 dark:hover:bg-primary/40 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </Badge>
          ))}
          
          {/* Input de busca */}
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={selectedTags.length === 0 ? placeholder : ""}
            disabled={disabled || selectedTags.length >= maxTags}
            className="flex-1 min-w-[120px] outline-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {/* Indicador de busca */}
          {searchTerm && (
            <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border">
              <Search className="w-3 h-3 inline mr-1" />
              Buscando por <span className="font-medium">{searchTerm}</span>
            </div>
          )}

          {/* Opção para criar nova tag */}
          {canCreateTag && (
            <button
              type="button"
              onClick={createNewTag}
              disabled={isCreating}
              className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2 text-primary border-b border-border transition-colors"
            >
              <Plus className="w-4 h-4" />
              {isCreating ? 'Criando...' : (
                <>
                  Criar <span className="font-medium">{searchTerm}</span>
                </>
              )}
            </button>
          )}

          {/* Tags disponíveis */}
          {filteredTags.length > 0 ? (
            <div className="max-h-40 overflow-auto">
              {filteredTags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => addTag(tag.id)}
                  className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2 text-popover-foreground transition-colors"
                >
                  <TagIcon className="w-4 h-4 text-muted-foreground" />
                  {tag.name}
                </button>
              ))}
            </div>
          ) : searchTerm && !canCreateTag ? (
            <div className="px-3 py-2 text-sm text-muted-foreground text-center">
              Nenhuma tag encontrada
            </div>
          ) : !searchTerm && filteredTags.length === 0 && selectedTags.length < tags.length ? (
            <div className="px-3 py-2 text-sm text-muted-foreground text-center">
              Todas as tags já foram selecionadas
            </div>
          ) : null}

          {/* Informação sobre limite */}
          {selectedTags.length >= maxTags && (
            <div className="px-3 py-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 border-t border-border">
              Limite máximo de {maxTags} tags atingido
            </div>
          )}
        </div>
      )}

      {/* Counter */}
      {selectedTags.length > 0 && (
        <div className="text-xs text-muted-foreground mt-1">
          {selectedTags.length} de {maxTags} tags selecionadas
        </div>
      )}
    </div>
  );
}