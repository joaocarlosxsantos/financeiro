import { Button } from '@/components/ui/button';
import { stableSortByDateAsc } from '@/lib/sort';
import { formatYmd } from '@/lib/utils';
import React, { useEffect, useState } from 'react';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Check, X, Info } from 'lucide-react';

interface ExtratoPreviewProps {
  preview: any[];
  wallets: any[];
  selectedWallet: string;
  onWalletChange: (id: string) => void;
  onSave: (registros: any[]) => void;
  saving: boolean;
  error: string | null;
  success: boolean;
  fetchWallets?: () => Promise<void>;
}
import { WalletCreateModal } from '@/components/ui/wallet-create-modal';
import { TransactionRow } from './transaction-row';
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
}: ExtratoPreviewProps) {
  const [registros, setRegistros] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [saldoAnterior, setSaldoAnterior] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);
  // Descobre a data do primeiro lançamento do extrato
  const dataPrimeiroLancamento = React.useMemo(() => {
    if (!registros.length) return null;
    // Considera que o campo 'data' está no formato 'dd/mm/yyyy' ou 'yyyy-mm-dd'
    const datas = registros
      .map((r) => {
        if (r.data && r.data.includes('/')) {
          const [d, m, y] = r.data.split('/');
          return new Date(Number(y), Number(m) - 1, Number(d));
        } else if (r.data && r.data.includes('-')) {
          return new Date(r.data);
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
        if (r.categoriaSugerida && categorias.length > 0) {
          const match = categorias.find(
            (c: any) => c.name.toLowerCase() === r.categoriaSugerida.toLowerCase(),
          );
          if (match) categoriaId = match.id;
          else categoriaId = r.categoriaSugerida;
        } else if (r.categoriaSugerida) {
          categoriaId = r.categoriaSugerida;
        }
        // Se categoriaId for string vazia, deixa como undefined
        if (categoriaId === '') categoriaId = undefined;
        return {
          ...r,
          categoriaId,
          tags: [], // Array de tags vazio inicialmente
          categoriaSugerida: r.categoriaSugerida || '',
        };
      }),
      (it: any) => {
        if (!it || !it.data) return undefined;
        if (typeof it.data === 'string' && it.data.includes('/')) {
          const [d, m, y] = it.data.split('/');
          return new Date(Number(y), Number(m) - 1, Number(d));
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
    if (!registro.categoriaSugerida) return;

    // Verifica se categoria existe
    const existingCategory = categorias.find(cat => 
      cat.name.toLowerCase() === registro.categoriaSugerida.toLowerCase()
    );

    if (existingCategory) {
      handleEdit(index, 'categoriaId', existingCategory.id);
    } else {
      handleEdit(index, 'categoriaId', registro.categoriaSugerida);
    }
  }

  // Função para rejeitar sugestão da IA
  function handleRejectAISuggestion(index: number) {
    handleEdit(index, 'categoriaSugerida', '');
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

  function handleSaveComSaldo() {
    let novosRegistros = [...registros];
    if (saldoAnterior && dataPrimeiroLancamento) {
      // Gera data do saldo inicial: um dia antes do primeiro lançamento
      const dataSaldo = new Date(dataPrimeiroLancamento);
      dataSaldo.setDate(dataSaldo.getDate() - 1);
      // Formata para yyyy-mm-dd
  // format YYYY-MM-DD using local date parts to avoid timezone shifts
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
    onSave(novosRegistros);
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
      
      <div className="bg-blue-50 p-3 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-blue-700">
          <Info className="w-4 h-4" />
          <span>
            A IA analisou suas transações e sugeriu categorias, melhorou descrições e identificou estabelecimentos.
            Revise as sugestões antes de salvar.
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border text-sm">
          <thead>
            <tr>
              <th className="border px-2 py-1">Data</th>
              <th className="border px-2 py-1">Valor</th>
              <th className="border px-2 py-1 min-w-[250px]">Descrição</th>
              <th className="border px-2 py-1 min-w-[200px]">Categoria</th>
              <th className="border px-2 py-1 min-w-[160px]">Tag</th>
              <th className="border px-2 py-1 min-w-[120px]">Info IA</th>
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
      <div className="flex flex-col gap-2">
        <Label className="font-medium">Selecione a carteira para vincular os lançamentos:</Label>
        <div className="flex gap-2 items-center">
          <Select value={selectedWallet} onChange={(e) => onWalletChange(e.target.value)}>
            <option value="">Selecione...</option>
            {wallets.map((w: any) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
          <Button variant="default" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Criar carteira
          </Button>
        </div>
        {/* Campo de saldo anterior */}
        {selectedWallet && dataPrimeiroLancamento && (
          <div className="flex flex-col gap-1 mt-2">
            <Label>
              Saldo do dia anterior a {dataPrimeiroLancamento.toLocaleDateString('pt-BR')}:
            </Label>
            <Input
              type="number"
              step="0.01"
              placeholder="Informe o saldo anterior"
              value={saldoAnterior}
              onChange={(e) => setSaldoAnterior(e.target.value)}
              className="max-w-xs"
            />
            <span className="text-xs text-gray-500">
              Esse valor será lançado como renda variável na data do primeiro dia do extrato.
            </span>
          </div>
        )}
        <Button onClick={handleSaveComSaldo} disabled={!selectedWallet || saving}>
          {saving ? 'Salvando...' : 'Salvar lançamentos'}
        </Button>
        <WalletCreateModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={async (id: string) => {
            setCreateOpen(false);
            if (id && typeof id === 'string' && id.length) {
              // recarrega carteiras se função disponível e seleciona a criada
              if (fetchWallets) await fetchWallets();
              onWalletChange(id);
            }
          }}
        />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">Importação realizada com sucesso!</div>}
      </div>
    </div>
  );
}
