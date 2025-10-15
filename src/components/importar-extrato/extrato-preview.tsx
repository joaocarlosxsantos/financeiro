import { Button } from '@/components/ui/button';
import { stableSortByDateAsc } from '@/lib/sort';
import { formatYmd } from '@/lib/utils';
import React, { useEffect, useState } from 'react';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Check, X, Info, Wand2 } from 'lucide-react';
import { normalizeDescription } from '@/lib/description-normalizer';

interface ExtratoPreviewProps {
  preview: any[];
  wallets: any[];
  selectedWallet: string;
  onWalletChange: (id: string) => void;
  onSave: (registros: any[], saldoAnterior?: number) => void;
  saving: boolean;
  error: string | null;
  success: boolean;
  fetchWallets?: () => Promise<void>;
  hideImportSummary?: boolean; // Nova prop para esconder o resumo
}
import { WalletCreateModal } from '@/components/ui/wallet-create-modal';
import { TransactionRow } from './transaction-row';
import { ImportSummary } from './import-summary';
import { Plus } from 'lucide-react';

export function ExtratoPreview({
  preview,
  wallets,
  selectedWallet,
  onWalletChange,
  onSave,
  saving,
  error,
  success,
  fetchWallets,
  hideImportSummary = false,
}: ExtratoPreviewProps) {
  const [registros, setRegistros] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);

  // Descobre a data do primeiro lançamento do extrato
  const dataPrimeiroLancamento = React.useMemo(() => {
    if (!registros.length) return null;
    // Considera que o campo 'data' pode estar no formato 'dd/mm/yyyy', 'yyyy-mm-dd' ou 'YYYYMMDD'
    const datas = registros
      .map((r) => {
        if (!r.data) return null;
        
        if (r.data.includes('/')) {
          // Formato DD/MM/YYYY
          const [d, m, y] = r.data.split('/');
          return new Date(Number(y), Number(m) - 1, Number(d));
        } else if (r.data.includes('-')) {
          // Formato ISO YYYY-MM-DD
          return new Date(r.data);
        } else if (r.data.length === 8 && /^\d{8}$/.test(r.data)) {
          // Formato YYYYMMDD
          const year = Number(r.data.substring(0, 4));
          const month = Number(r.data.substring(4, 6)) - 1; // Month is 0-indexed
          const day = Number(r.data.substring(6, 8));
          return new Date(year, month, day);
        }
        return null;
      })
      .filter(Boolean) as Date[];
    if (!datas.length) return null;
    return new Date(Math.min(...datas.map((d) => d.getTime())));
  }, [registros]);

  useEffect(() => {
    setRegistros(
      stableSortByDateAsc(preview.map((r) => {
        // Se a categoria sugerida já existe, preenche com o id dela
        let categoriaId: string | undefined = undefined;
        let shouldCreateCategory = false;
        
        if (r.categoriaSugerida && categorias.length > 0) {
          const match = categorias.find(
            (c: any) => c.name.toLowerCase() === r.categoriaSugerida.toLowerCase(),
          );
          if (match) {
            categoriaId = match.id;
          } else {
            // Categoria não existe, marcar para criação
            shouldCreateCategory = true;
          }
        } else if (r.categoriaSugerida) {
          shouldCreateCategory = true;
        }
        
        // Se categoriaId for string vazia, deixa como undefined
        if (categoriaId === '') categoriaId = undefined;
        
        return {
          ...r,
          categoriaId,
          tags: [], // Array de tags vazio inicialmente
          categoriaSugerida: r.categoriaSugerida || '',
          shouldCreateCategory,
        };
      }),
      (it: any) => {
        if (!it || !it.data) return undefined;
        
        if (typeof it.data === 'string') {
          if (it.data.includes('/')) {
            // Formato DD/MM/YYYY
            const [d, m, y] = it.data.split('/');
            return new Date(Number(y), Number(m) - 1, Number(d));
          } else if (it.data.includes('-')) {
            // Formato ISO YYYY-MM-DD
            return new Date(it.data);
          } else if (it.data.length === 8 && /^\d{8}$/.test(it.data)) {
            // Formato YYYYMMDD
            const year = Number(it.data.substring(0, 4));
            const month = Number(it.data.substring(4, 6)) - 1; // Month is 0-indexed
            const day = Number(it.data.substring(6, 8));
            return new Date(year, month, day);
          }
        }
        
        return it.data ? new Date(it.data) : undefined;
      },
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, categorias]);

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then(setCategorias);
    // Busca tags sem cache para garantir que novas tags apareçam imediatamente
    fetch('/api/tags', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setTags);
  }, []);

  // Trunca uma string sem cortar no meio da palavra
  function truncateByWord(text: string | undefined, max = 60) {
    if (!text) return '';
    if (text.length <= max) return text;
    const sub = text.slice(0, max);
    const lastSpace = sub.lastIndexOf(' ');
    if (lastSpace === -1) return sub + '...';
    return sub.slice(0, lastSpace) + '...';
  }

  function handleEdit(index: number, field: string, value: string | string[]) {
    setRegistros((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  // Função para normalizar todas as descrições
  function handleNormalizeAllDescriptions() {
    setRegistros((prev) => prev.map(registro => ({
      ...registro,
      descricaoMelhorada: normalizeDescription(registro.descricao)
    })));
  }

  // Função para criar categoria automaticamente
  async function handleCreateCategory(categoryName: string, categoryType: string) {
    try {
      const response = await fetch('/api/ai/analyze-transaction', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: categoryName,
          type: categoryType,
          color: getCategoryColor(categoryName),
          icon: getCategoryIcon(categoryName)
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Atualiza lista de categorias
          setCategorias(prev => [...prev, result.category]);
          return result.category;
        }
      }
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
    }
  }

  // Função para criar tag automaticamente
  async function handleCreateTag(tagName: string) {
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: tagName
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Atualiza lista de tags
        setTags(prev => [...prev, result]);
        return result;
      }
    } catch (error) {
      console.error('Erro ao criar tag:', error);
    }
  }

  // Função para aceitar sugestão da IA
  function handleAcceptAISuggestion(index: number) {
    const registro = registros[index];
    if (!registro.categoriaRecomendada) return;

    // Se já tem ID da categoria, usar diretamente
    if (registro.categoriaId) {
      handleEdit(index, 'categoriaId', registro.categoriaId);
    } else {
      // Verifica se categoria existe
      const existingCategory = categorias.find(cat => 
        cat.name.toLowerCase() === registro.categoriaRecomendada.toLowerCase()
      );

      if (existingCategory) {
        handleEdit(index, 'categoriaId', existingCategory.id);
      } else {
        // Marca para criar a categoria durante importação
        handleEdit(index, 'categoriaId', registro.categoriaRecomendada);
      }
    }
    
    // Remove a sugestão após aceitar
    handleEdit(index, 'categoriaRecomendada', '');
  }

  // Função para rejeitar sugestão da IA
  function handleRejectAISuggestion(index: number) {
    handleEdit(index, 'categoriaRecomendada', '');
    setRegistros(prev => prev.map((r, i) => 
      i === index ? { ...r, shouldCreateCategory: false } : r
    ));
  }

  // Função para obter cor da categoria
  function getCategoryColor(categoryName: string): string {
    const colorMap: Record<string, string> = {
      'alimentação': '#EF4444',
      'supermercado': '#10B981',
      'transporte': '#3B82F6',
      'saúde': '#EF4444',
      'educação': '#8B5CF6',
      'lazer': '#F59E0B',
      'tecnologia': '#06B6D4',
      'assinaturas': '#8B5CF6',
      'casa': '#84CC16',
      'roupas': '#EC4899',
      'investimentos': '#10B981',
      'impostos': '#EF4444',
      'cartão de crédito': '#F97316',
      'transferência': '#6B7280',
      'serviços': '#6B7280',
      'salário': '#10B981',
      'outros': '#6B7280'
    };
    return colorMap[categoryName.toLowerCase()] || '#6B7280';
  }

  // Função para obter ícone da categoria
  function getCategoryIcon(categoryName: string): string | null {
    const iconMap: Record<string, string> = {
      'alimentação': '🍽️',
      'supermercado': '🛒',
      'transporte': '🚗',
      'saúde': '⚕️',
      'educação': '📚',
      'lazer': '🎬',
      'tecnologia': '💻',
      'assinaturas': '📱',
      'casa': '🏠',
      'roupas': '👕',
      'investimentos': '💰',
      'impostos': '📋',
      'cartão de crédito': '💳',
      'transferência': '💸',
      'salário': '💼'
    };
    return iconMap[categoryName.toLowerCase()] || null;
  }

  async function handleSaveComSaldo(saldoAnterior?: number) {
    let novosRegistros = [...registros];

    // Processar sugestões da IA automaticamente se o usuário não fez seleções
    for (const registro of novosRegistros) {
      // Se usuário não selecionou categoria e existe recomendação da IA
      if (!registro.categoriaId && registro.categoriaRecomendada && registro.shouldCreateCategory) {
        try {
          const categoryType = registro.valor < 0 ? 'EXPENSE' : 'INCOME';
          const newCategory = await handleCreateCategory(registro.categoriaRecomendada, categoryType);
          if (newCategory) {
            registro.categoriaId = newCategory.id;
            registro.shouldCreateCategory = false;
          }
        } catch (error) {
          console.error('Erro ao criar categoria automaticamente:', error);
        }
      } else if (!registro.categoriaId && registro.categoriaRecomendada && !registro.shouldCreateCategory) {
        // Se categoria já existe, apenas definir o nome para o backend resolver
        registro.categoriaId = registro.categoriaRecomendada;
      }

      // Criar tags que precisam ser criadas
      if (registro.tagsRecomendadas && registro.tagsRecomendadas.length > 0) {
        const tagsToCreate = registro.tagsRecomendadas.filter((tagName: string) => 
          !tags.some((existingTag: any) => existingTag.name.toLowerCase() === tagName.toLowerCase())
        );
        
        for (const tagName of tagsToCreate) {
          try {
            await handleCreateTag(tagName);
          } catch (error) {
            console.error('Erro ao criar tag automaticamente:', error);
          }
        }
        
        // Adicionar todas as tags recomendadas às tags do registro
        registro.tags = [...(registro.tags || []), ...registro.tagsRecomendadas];
      }
    }

    // Adicionar saldo anterior se informado
    if (saldoAnterior && dataPrimeiroLancamento && !isNaN(saldoAnterior) && saldoAnterior !== 0) {
      // Gera data do saldo inicial: um dia antes do primeiro lançamento
      const dataSaldo = new Date(dataPrimeiroLancamento);
      dataSaldo.setDate(dataSaldo.getDate() - 1);
      // Formata para yyyy-mm-dd
      const dataFormatada = formatYmd(dataSaldo);
      // Busca categoria "Saldo" (ou cria string caso não exista)
      let categoriaId = '';
      const catSaldo = categorias.find((c: any) => c.name.toLowerCase() === 'saldo');
      if (catSaldo) categoriaId = catSaldo.id;
      else categoriaId = 'Saldo';
      novosRegistros = [
        {
          data: dataFormatada,
          valor: saldoAnterior,
          descricao: 'Saldo inicial',
          descricaoSimplificada: 'Saldo inicial',
          categoriaId,
          categoriaSugerida: 'Saldo',
          tags: [], // Array vazio para tags
          tipo: 'RENDA_VARIAVEL',
          isSaldoInicial: true,
        },
        ...novosRegistros,
      ];
    }
    onSave(novosRegistros, saldoAnterior);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">Pré-visualização dos dados</h2>
        <Badge className="bg-blue-100 text-blue-800">
          <Sparkles className="w-4 h-4 mr-1" />
          IA Ativada
        </Badge>
      </div>
      
      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
          <Info className="w-4 h-4" />
          <span>
            A IA analisou suas transações e sugeriu categorias, melhorou descrições e identificou estabelecimentos.
            Revise as sugestões antes de salvar.
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-background shadow-sm">
        <table className="min-w-full">
          <thead>
            <tr className="bg-muted text-muted-foreground">
              <th className="px-4 py-4 text-left font-semibold w-28">Data</th>
              <th className="px-4 py-4 text-right font-semibold w-32">Valor</th>
              <th className="px-4 py-4 text-left font-semibold min-w-[350px]">
                <div className="flex items-center justify-between">
                  <span>Descrição</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleNormalizeAllDescriptions}
                    className="h-8 px-3 text-xs text-purple-600 hover:bg-purple-50 hover:text-purple-700 transition-colors border border-purple-200 hover:border-purple-300"
                    title="Simplificar todas as descrições automaticamente"
                  >
                    <Wand2 className="w-3 h-3 mr-1" />
                    Simplificar tudo
                  </Button>
                </div>
              </th>
              <th className="px-4 py-4 text-left font-semibold min-w-[180px]">Categoria</th>
              <th className="px-4 py-4 text-left font-semibold min-w-[160px]">Tags</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((row, i) => (
              <TransactionRow
                key={i}
                registro={row}
                index={i}
                categorias={categorias}
                tags={tags}
                onEdit={handleEdit}
                onCreateCategory={handleCreateCategory}
                onCreateTag={handleCreateTag}
                onAcceptAISuggestion={handleAcceptAISuggestion}
                onRejectAISuggestion={handleRejectAISuggestion}
              />
            ))}
          </tbody>
        </table>
      </div>
      {!hideImportSummary && (
        <ImportSummary
          wallets={wallets}
          selectedWallet={selectedWallet}
          onWalletChange={onWalletChange}
          onSave={handleSaveComSaldo}
          saving={saving}
          error={error}
          success={success}
          fetchWallets={fetchWallets}
          totalFiles={1}
          totalTransactions={registros.length}
          totalIncome={registros.filter(r => r.valor > 0).reduce((acc, r) => acc + r.valor, 0)}
          totalExpense={registros.filter(r => r.valor < 0).reduce((acc, r) => acc + Math.abs(r.valor), 0)}
          firstTransactionDate={dataPrimeiroLancamento}
        />
      )}
    </div>
  );
}
