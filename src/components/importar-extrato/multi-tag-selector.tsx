import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus, Check } from 'lucide-react';

interface MultiTagSelectorProps {
  selectedTags: string[];
  availableTags: Array<{ id: string; name: string }>;
  onTagsChange: (tags: string[]) => void;
  onCreateTag: (tagName: string) => Promise<void>;
}

export function MultiTagSelector({
  selectedTags,
  availableTags,
  onTagsChange,
  onCreateTag
}: MultiTagSelectorProps) {
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // Adiciona uma tag à seleção
  const addTag = (tagId: string) => {
    if (!selectedTags.includes(tagId)) {
      onTagsChange([...selectedTags, tagId]);
    }
  };

  // Remove uma tag da seleção
  const removeTag = (tagId: string) => {
    onTagsChange(selectedTags.filter(id => id !== tagId));
  };

  // Cria uma nova tag
  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    setIsCreatingTag(true);
    try {
      await onCreateTag(newTagName.trim());
      setNewTagName('');
      setShowCreateTag(false);
    } catch (error) {
      console.error('Erro ao criar tag:', error);
    } finally {
      setIsCreatingTag(false);
    }
  };

  // Obtém informações das tags selecionadas
  const getSelectedTagsInfo = () => {
    return selectedTags.map(tagId => {
      const tag = availableTags.find(t => t.id === tagId);
      return tag ? { id: tagId, name: tag.name } : null;
    }).filter(Boolean);
  };

  return (
    <div className="space-y-2">
      {/* Tags selecionadas */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {getSelectedTagsInfo().map((tag) => (
            <Badge
              key={tag!.id}
              variant="default"
              className="text-xs flex items-center gap-1"
            >
              {tag!.name}
              <X
                className="w-3 h-3 cursor-pointer hover:bg-red-100 rounded"
                onClick={() => removeTag(tag!.id)}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Seletor de tags disponíveis */}
      <select
        value=""
        onChange={(e) => {
          if (e.target.value) {
            addTag(e.target.value);
            e.target.value = ''; // Reset do select
          }
        }}
        className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
      >
        <option value="">+ Adicionar tag...</option>
        {availableTags
          .filter(tag => !selectedTags.includes(tag.id))
          .map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
      </select>

      {/* Criar nova tag */}
      <div className="space-y-1">
        {!showCreateTag ? (
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-6"
            onClick={() => setShowCreateTag(true)}
          >
            <Plus className="w-3 h-3 mr-1" />
            Nova tag
          </Button>
        ) : (
          <div className="flex items-center gap-1">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="text-xs h-6 flex-1"
              placeholder="Nome da nova tag"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreateTag();
                }
              }}
            />
            <Button
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleCreateTag}
              disabled={isCreatingTag || !newTagName.trim()}
            >
              <Check className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-6 p-0"
              onClick={() => {
                setShowCreateTag(false);
                setNewTagName('');
              }}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}