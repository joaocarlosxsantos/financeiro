import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Check, X, Info, Plus, Edit3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { MultiTagSelector } from './multi-tag-selector';

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

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return <Badge className="bg-green-100 text-green-800">Alta</Badge>;
    if (confidence >= 0.6) return <Badge className="bg-yellow-100 text-yellow-800">Média</Badge>;
    return <Badge className="bg-red-100 text-red-800">Baixa</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <tr className={registro.shouldCreateCategory ? 'bg-blue-50' : ''}>
      {/* Data */}
      <td className="border px-2 py-1 text-xs">
        <Input
          value={registro.data}
          onChange={(e) => onEdit(index, 'data', e.target.value)}
          className="text-xs h-8"
        />
      </td>

      {/* Valor */}
      <td className={`border px-2 py-1 text-xs font-semibold ${
        registro.valor < 0 ? 'text-red-600' : 'text-green-600'
      }`}>
        {formatCurrency(registro.valor)}
      </td>

      {/* Descrição com melhorias da IA */}
      <td className="border px-2 py-1 text-xs">
        <div className="space-y-1">
          {/* Descrição melhorada */}
          <Input
            value={registro.descricaoMelhorada || registro.descricao}
            onChange={(e) => onEdit(index, 'descricaoMelhorada', e.target.value)}
            className="text-xs h-8"
            placeholder="Descrição"
          />
          
          {/* Indicador de melhoria da IA */}
          {registro.descricaoMelhorada && 
           registro.descricaoMelhorada !== registro.descricao && (
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-500" />
              <span className="text-xs text-blue-600">IA melhorou a descrição</span>
            </div>
          )}

          {/* Descrição original (se diferente) */}
          {registro.descricaoMelhorada && 
           registro.descricaoMelhorada !== registro.descricao && (
            <div className="text-xs text-gray-500">
              Original: {registro.descricao}
            </div>
          )}
        </div>
      </td>

      {/* Categoria com sugestões da IA */}
      <td className="border px-2 py-1 text-xs">
        <div className="space-y-1">
          <select
            value={registro.categoriaId || ''}
            onChange={(e) => onEdit(index, 'categoriaId', e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1 w-full"
          >
            <option value="">Selecione...</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Sugestão da IA */}
          {registro.categoriaSugerida && (
            <div className="flex items-center gap-1 flex-wrap">
              <Sparkles className="w-3 h-3 text-blue-500" />
              <span className="text-xs text-blue-600">Sugestão IA:</span>
              <Badge 
                variant="outline" 
                className="text-xs cursor-pointer hover:bg-blue-50"
                onClick={() => onAcceptAISuggestion(index)}
              >
                {registro.categoriaSugerida}
              </Badge>
              
              {/* Indicador de confiança */}
              {registro.aiAnalysis?.confidence && (
                getConfidenceBadge(registro.aiAnalysis.confidence)
              )}
            </div>
          )}

          {/* Botão para criar nova categoria */}
          {registro.shouldCreateCategory && (
            <div className="space-y-1">
              {!showCategoryCreate ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-6"
                  onClick={() => {
                    setNewCategoryName(registro.categoriaSugerida);
                    setShowCategoryCreate(true);
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Criar &quot;{registro.categoriaSugerida}&quot;
                </Button>
              ) : (
                <div className="flex items-center gap-1">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="text-xs h-6 flex-1"
                    placeholder="Nome da categoria"
                  />
                  <Button
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handleCreateCategory}
                    disabled={isCreatingCategory}
                  >
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      setShowCategoryCreate(false);
                      setNewCategoryName('');
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </td>

      {/* Tags múltiplas */}
      <td className="border px-2 py-1 text-xs">
        <MultiTagSelector
          selectedTags={registro.tags || []}
          availableTags={tags}
          suggestedTags={registro.tagsRecomendadas || []}
          onTagsChange={(newTags) => onEdit(index, 'tags', newTags)}
          onCreateTag={onCreateTag}
        />
      </td>

      {/* Informações adicionais da IA */}
      <td className="border px-2 py-1 text-xs">
        {registro.aiAnalysis && (
          <div className="space-y-1">
            {/* Merchant detectado */}
            {registro.aiAnalysis.merchant && (
              <div className="flex items-center gap-1">
                <Info className="w-3 h-3 text-gray-400" />
                <span className="text-gray-600">
                  {registro.aiAnalysis.merchant}
                </span>
              </div>
            )}

            {/* Localização */}
            {registro.aiAnalysis.location && (
              <div className="flex items-center gap-1">
                <Info className="w-3 h-3 text-gray-400" />
                <span className="text-gray-600">
                  📍 {registro.aiAnalysis.location}
                </span>
              </div>
            )}

            {/* Tipo da categoria */}
            <Badge 
              variant={
                registro.aiAnalysis.categoryType === 'INCOME' ? 'default' : 'secondary'
              }
              className="text-xs"
            >
              {registro.aiAnalysis.categoryType === 'INCOME' ? 'Receita' : 'Despesa'}
            </Badge>
          </div>
        )}
      </td>
    </tr>
  );
}