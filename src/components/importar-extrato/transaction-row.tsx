import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, Plus, Wand2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MultiTagSelector } from './multi-tag-selector';
import { normalizeDescription } from '@/lib/description-normalizer';

interface TransactionRowProps {
  registro: any;
  index: number;
  categorias: any[];
  tags: any[];
  onEdit: (index: number, field: string, value: string | string[]) => void;
  onCreateCategory: (categoryName: string, categoryType: string) => Promise<void>;
  onCreateTag: (tagName: string) => Promise<void>;
  onAcceptAISuggestion: (index: number) => void;
  onRejectAISuggestion: (index: number) => void;
}

export function TransactionRow({
  registro,
  index,
  categorias,
  tags,
  onEdit,
  onCreateCategory,
  onCreateTag,
  onAcceptAISuggestion,
  onRejectAISuggestion
}: TransactionRowProps) {
  const [showCategoryCreate, setShowCategoryCreate] = React.useState(false);
  const [newCategoryName, setNewCategoryName] = React.useState('');
  const [isCreatingCategory, setIsCreatingCategory] = React.useState(false);
  const [showTagCreate, setShowTagCreate] = React.useState(false);
  const [newTagName, setNewTagName] = React.useState('');
  const [isCreatingTag, setIsCreatingTag] = React.useState(false);

  const handleNormalizeDescription = () => {
    const normalized = normalizeDescription(registro.descricao);
    onEdit(index, 'descricaoMelhorada', normalized);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    setIsCreatingCategory(true);
    try {
      const categoryType = registro.valor < 0 ? 'EXPENSE' : 'INCOME';
      await onCreateCategory(newCategoryName.trim(), categoryType);
      setShowCategoryCreate(false);
      setNewCategoryName('');
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    
    setIsCreatingTag(true);
    try {
      await onCreateTag(newTagName.trim());
      setShowTagCreate(false);
      setNewTagName('');
    } catch (error) {
      console.error('Erro ao criar tag:', error);
    } finally {
      setIsCreatingTag(false);
    }
  };

  const formatCurrency = (value: number | string) => {
    const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Data inválida';
    
    let date: Date;
    
    // Se é formato YYYYMMDD, converter para Date
    if (dateString && /^\d{8}$/.test(dateString)) {
      const year = parseInt(dateString.substring(0, 4));
      const month = parseInt(dateString.substring(4, 6)) - 1; // Mês é 0-indexed no JS
      const day = parseInt(dateString.substring(6, 8));
      date = new Date(year, month, day);
    } 
    // Se já é formato DD/MM/YYYY, apenas retornar
    else if (dateString && /^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      return dateString;
    }
    else {
      date = new Date(dateString);
    }
    
    // Verificar se a data é válida
    if (isNaN(date.getTime())) {
      return 'Data inválida';
    }
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <tr className="border-b hover:bg-accent/50 transition-colors group" style={{ minHeight: '70px' }}>
      {/* Data */}
      <td className="px-4 py-3 w-28">
        <div className="text-sm font-medium text-muted-foreground">
          {formatDate(registro.data)}
        </div>
      </td>

      {/* Valor */}
      <td className="px-4 py-3 text-right w-32">
        <div className={`font-semibold text-sm ${
          registro.valor < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
        }`}>
          {formatCurrency(registro.valor)}
        </div>
      </td>

      {/* Descrição */}
      <td className="px-4 py-3">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={registro.descricaoMelhorada || registro.descricao}
              onChange={(e) => onEdit(index, 'descricaoMelhorada', e.target.value)}
              className="h-9 flex-1 text-sm border-input focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Descrição da transação"
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleNormalizeDescription}
              className="h-9 px-3 text-muted-foreground hover:text-primary hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
              title="Simplificar descrição automaticamente"
            >
              <Wand2 className="w-4 h-4" />
            </Button>
          </div>
          {/* Descrição Original */}
          {registro.descricao !== (registro.descricaoMelhorada || registro.descricao) && (
            <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded border-l-2 border-border">
              <span className="font-medium">Original:</span> {registro.descricao}
            </div>
          )}
        </div>
      </td>

      {/* Categoria */}
      <td className="px-4 py-3">
        <div className="space-y-2">
          <div className="flex gap-2">
            <select
              value={registro.categoriaId || ''}
              onChange={(e) => onEdit(index, 'categoriaId', e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">Selecionar categoria</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowCategoryCreate(!showCategoryCreate)}
              className="h-9 px-3 text-muted-foreground hover:text-primary hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
              title="Criar nova categoria"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Sugestão de IA para categoria */}
          {registro.categoriaRecomendada && (
            <div className="flex items-center gap-2 bg-primary/5 px-2 py-1 rounded text-xs border border-primary/20">
              <span className="text-primary font-medium">IA sugere:</span>
              <span className="text-foreground">{registro.categoriaRecomendada}</span>
              <div className="flex gap-1 ml-auto">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onAcceptAISuggestion(index)}
                  className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                  title="Aceitar sugestão"
                >
                  <Check className="w-3 h-3" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onRejectAISuggestion(index)}
                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="Rejeitar sugestão"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
          
          {/* Criação de nova categoria */}
          {showCategoryCreate && (
            <div className="flex gap-2 p-2 bg-muted/50 rounded-md border border-border">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nome da nova categoria"
                className="h-8 text-sm bg-background"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateCategory();
                  }
                  if (e.key === 'Escape') {
                    setShowCategoryCreate(false);
                    setNewCategoryName('');
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                onClick={handleCreateCategory}
                disabled={isCreatingCategory || !newCategoryName.trim()}
                className="h-8 px-3"
              >
                {isCreatingCategory ? 'Criando...' : 'Criar'}
              </Button>
            </div>
          )}
        </div>
      </td>

      {/* Tags */}
      <td className="px-4 py-3">
        <div className="space-y-2">
          <div className="flex gap-2">
            <select
              value={(registro.tags && registro.tags.length > 0) ? registro.tags[0] : ''}
              onChange={(e) => {
                const selectedTag = e.target.value;
                if (selectedTag && !registro.tags?.includes(selectedTag)) {
                  onEdit(index, 'tags', [...(registro.tags || []), selectedTag]);
                }
              }}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">Selecionar tag</option>
              {tags
                .filter(tag => !registro.tags?.includes(tag.id))
                .map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
            </select>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowTagCreate(!showTagCreate)}
              className="h-9 px-3 text-muted-foreground hover:text-primary hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
              title="Criar nova tag"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Tags selecionadas */}
          {registro.tags && registro.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {registro.tags.map((tagId: string) => {
                const tag = tags.find(t => t.id === tagId);
                return tag ? (
                  <div key={tagId} className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-xs">
                    <span>{tag.name}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const newTags = registro.tags.filter((id: string) => id !== tagId);
                        onEdit(index, 'tags', newTags);
                      }}
                      className="h-3 w-3 p-0 text-primary/70 hover:text-primary"
                    >
                      <X className="w-2 h-2" />
                    </Button>
                  </div>
                ) : null;
              })}
            </div>
          )}

          {/* Sugestões de IA para tags */}
          {registro.tagsRecomendadas && registro.tagsRecomendadas.length > 0 && (
            <div className="space-y-1">
              {registro.tagsRecomendadas.map((tagName: string) => (
                <div key={tagName} className="flex items-center gap-2 bg-primary/5 px-2 py-1 rounded text-xs border border-primary/20">
                  <span className="text-primary font-medium">IA sugere:</span>
                  <span className="text-foreground">{tagName}</span>
                  <div className="flex gap-1 ml-auto">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        // Adicionar tag sugerida à lista
                        const currentTags = registro.tags || [];
                        if (!currentTags.includes(tagName)) {
                          onEdit(index, 'tags', [...currentTags, tagName]);
                        }
                      }}
                      className="h-4 w-4 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                      title="Aceitar sugestão"
                    >
                      <Check className="w-2 h-2" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        // Remover sugestão
                        const newSuggestions = registro.tagsRecomendadas.filter((name: string) => name !== tagName);
                        onEdit(index, 'tagsRecomendadas', newSuggestions);
                      }}
                      className="h-4 w-4 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Rejeitar sugestão"
                    >
                      <X className="w-2 h-2" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Criação de nova tag */}
          {showTagCreate && (
            <div className="flex gap-2 p-2 bg-muted/50 rounded-md border border-border">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Nome da nova tag"
                className="h-8 text-sm bg-background"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateTag();
                  }
                  if (e.key === 'Escape') {
                    setShowTagCreate(false);
                    setNewTagName('');
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                onClick={handleCreateTag}
                disabled={isCreatingTag || !newTagName.trim()}
                className="h-8 px-3"
              >
                {isCreatingTag ? 'Criando...' : 'Criar'}
              </Button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}