import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, Plus, Wand2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MultiTagSelector } from '../importar-extrato/multi-tag-selector';

interface FaturaTransactionRowProps {
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

export function FaturaTransactionRow({
  registro,
  index,
  categorias,
  tags,
  onEdit,
  onCreateCategory,
  onCreateTag,
  onAcceptAISuggestion,
  onRejectAISuggestion
}: FaturaTransactionRowProps) {
  const [showCategoryCreate, setShowCategoryCreate] = React.useState(false);
  const [newCategoryName, setNewCategoryName] = React.useState('');
  const [isCreatingCategory, setIsCreatingCategory] = React.useState(false);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    setIsCreatingCategory(true);
    try {
      // Para faturas de cartão, sempre será EXPENSE (débito = compra negativa)
      const categoryType = 'EXPENSE';
      await onCreateCategory(newCategoryName.trim(), categoryType);
      setShowCategoryCreate(false);
      setNewCategoryName('');
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const formatCurrency = (value: number | string) => {
    const numValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Data inválida';
    
    // Se é formato ISO (YYYY-MM-DD)
    if (dateString.includes('-')) {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    }
    
    return dateString;
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
        <div className="font-semibold text-sm text-red-600 dark:text-red-400">
          {formatCurrency(registro.valor)}
        </div>
      </td>

      {/* Descrição */}
      <td className="px-4 py-3">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={registro.descricao || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onEdit(index, 'descricao', e.target.value)}
              placeholder="Descrição da compra"
              className="flex-1 text-sm"
            />
          </div>
        </div>
      </td>

      {/* Categoria */}
      <td className="px-4 py-3">
        <div className="space-y-2">
          <div className="flex gap-2">
            <select
              value={registro.categoriaId || ''}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onEdit(index, 'categoriaId', e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
              variant="outline"
              size="icon"
              onClick={() => setShowCategoryCreate(!showCategoryCreate)}
              className="shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Sugestão da IA */}
          {registro.categoriaSugerida && !registro.categoriaId && (
            <div className="flex items-center gap-2 bg-primary/5 px-2 py-1 rounded text-xs border border-primary/20">
              <span className="text-primary font-medium">IA sugere:</span>
              <span className="text-foreground">{registro.categoriaSugerida}</span>
              <div className="flex gap-1 ml-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onAcceptAISuggestion(index)}
                >
                  <Check className="h-3 w-3 text-green-600" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onRejectAISuggestion(index)}
                >
                  <X className="h-3 w-3 text-red-600" />
                </Button>
              </div>
            </div>
          )}

          {/* Criar nova categoria */}
          {showCategoryCreate && (
            <div className="flex gap-2 p-2 bg-muted/50 rounded-md border border-border">
              <Input
                value={newCategoryName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCategoryName(e.target.value)}
                placeholder="Nome da categoria"
                className="flex-1"
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateCategory();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleCreateCategory}
                disabled={isCreatingCategory || !newCategoryName.trim()}
                size="sm"
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
          <MultiTagSelector
            availableTags={tags}
            selectedTags={registro.tags || []}
            suggestedTags={[]}
            onTagsChange={(selectedTags: string[]) => onEdit(index, 'tags', selectedTags)}
            onCreateTag={onCreateTag}
          />
        </div>
      </td>
    </tr>
  );
}
