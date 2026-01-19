import React from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
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
      // Determinar o tipo baseado no valor
      const valor = typeof registro.valor === 'number' ? registro.valor : parseFloat(String(registro.valor)) || 0;
      const categoryType = valor < 0 ? 'INCOME' : 'EXPENSE';
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

  // Determinar se é crédito (valor negativo) ou despesa (valor positivo)
  const valor = typeof registro.valor === 'number' ? registro.valor : parseFloat(String(registro.valor)) || 0;
  const isCredito = valor < 0;
  const colorClass = isCredito 
    ? 'text-green-600 dark:text-green-400' 
    : 'text-red-600 dark:text-red-400';

  return (
    <tr className="border-b hover:bg-accent/50 transition-colors group">
      {/* Data */}
      <td className="px-3 py-2 w-[100px]">
        <div className="text-xs font-medium text-muted-foreground whitespace-nowrap">
          {formatDate(registro.data)}
        </div>
      </td>

      {/* Valor */}
      <td className="px-3 py-2 text-right w-[110px]">
        <div className={`font-semibold text-xs ${colorClass} whitespace-nowrap`}>
          {formatCurrency(registro.valor)}
        </div>
      </td>

      {/* Descrição */}
      <td className="px-3 py-2 w-[30%]">
        <Input
          value={registro.descricao || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onEdit(index, 'descricao', e.target.value)}
          placeholder={isCredito ? "Descrição do crédito/estorno" : "Descrição da compra"}
          className="h-8 text-xs w-full"
        />
      </td>

      {/* Categoria */}
      <td className="px-3 py-2 w-[25%]">
        <div className="space-y-1.5">
          <div className="flex gap-1.5">
            <Select
              value={registro.categoriaId || ''}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onEdit(index, 'categoriaId', e.target.value)}
              className="h-8 text-xs"
            >
              <option value="">Selecionar</option>
              {categorias
                .filter(cat => {
                  // Para créditos: mostrar apenas INCOME e BOTH
                  if (isCredito) {
                    return cat.type === 'INCOME' || cat.type === 'BOTH';
                  }
                  // Para despesas: mostrar apenas EXPENSE e BOTH
                  return cat.type === 'EXPENSE' || cat.type === 'BOTH';
                })
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowCategoryCreate(!showCategoryCreate)}
              className="shrink-0 h-8 w-8"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          {/* Sugestão da IA */}
          {registro.categoriaSugerida && !registro.categoriaId && (
            <div className="flex items-center gap-1.5 bg-primary/5 px-2 py-1 rounded text-[10px] border border-primary/20">
              <Wand2 className="h-3 w-3 text-primary shrink-0" />
              <span className="text-foreground truncate flex-1">{registro.categoriaSugerida}</span>
              <div className="flex gap-0.5 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => onAcceptAISuggestion(index)}
                >
                  <Check className="h-3 w-3 text-green-600" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => onRejectAISuggestion(index)}
                >
                  <X className="h-3 w-3 text-red-600" />
                </Button>
              </div>
            </div>
          )}

          {/* Criar nova categoria */}
          {showCategoryCreate && (
            <div className="flex gap-1.5 p-1.5 bg-muted/50 rounded-md border border-border">
              <Input
                value={newCategoryName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCategoryName(e.target.value)}
                placeholder="Nome da categoria"
                className="flex-1 h-7 text-xs"
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
                className="h-7 text-xs px-2"
              >
                {isCreatingCategory ? 'Criando...' : 'Criar'}
              </Button>
            </div>
          )}
        </div>
      </td>

      {/* Tags */}
      <td className="px-3 py-2 w-[25%]">
        <MultiTagSelector
          availableTags={tags}
          selectedTags={registro.tags || []}
          suggestedTags={[]}
          onTagsChange={(selectedTags: string[]) => onEdit(index, 'tags', selectedTags)}
          onCreateTag={onCreateTag}
        />
      </td>
    </tr>
  );
}
