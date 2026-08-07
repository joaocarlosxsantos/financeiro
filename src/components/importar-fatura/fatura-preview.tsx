"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MonthSelector } from '@/components/ui/month-selector';
import { Sparkles, CreditCard, Info, Wand2 } from 'lucide-react';
import { FaturaTransactionRow } from './fatura-transaction-row';
import { ConflictResolutionModal } from '@/components/ui/conflict-resolution-modal';
import {
  CategoryConfirmationModal,
  type PendingNewCategory,
  type CategoryDecision,
} from '@/components/ui/category-confirmation-modal';

interface FaturaPreviewProps {
  preview: any[];
  categorias?: any[]; // Categorias existentes vindas da API
  creditCards: any[];
  selectedCreditCard: string;
  onCreditCardChange: (id: string) => void;
  billPeriod: string; // Formato YYYY-MM
  onBillPeriodChange: (period: string) => void;
  onSave: (registros: any[], deleteExisting?: boolean) => void;
  saving: boolean;
  error: string | null;
  success: boolean;
}

export function FaturaPreview({
  preview,
  categorias: categoriasIniciais = [],
  creditCards,
  selectedCreditCard,
  onCreditCardChange,
  billPeriod,
  onBillPeriodChange,
  onSave,
  saving,
  error,
  success,
}: FaturaPreviewProps) {
  const [registros, setRegistros] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showCategoryConfirm, setShowCategoryConfirm] = useState(false);
  const [pendingNewCategories, setPendingNewCategories] = useState<PendingNewCategory[]>([]);
  const [pendingDeleteExisting, setPendingDeleteExisting] = useState(false);

  // Levanta, sem duplicar, as categorias novas que seriam criadas
  // automaticamente ao salvar (usadas na tela de confirmação em lote).
  function collectPendingNewCategories(regs: any[]): PendingNewCategory[] {
    const map = new Map<string, PendingNewCategory>();
    for (const r of regs) {
      if (!r.categoriaId && r.categoriaSugerida && r.isNewCategory) {
        const key = r.categoriaSugerida;
        const valor = typeof r.valor === 'number' ? r.valor : parseFloat(String(r.valor)) || 0;
        const type: 'EXPENSE' | 'INCOME' = valor < 0 ? 'INCOME' : 'EXPENSE';
        const existing = map.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(key, { originalName: key, type, count: 1 });
        }
      }
    }
    return Array.from(map.values());
  }

  useEffect(() => {
    // Inicializar registros - garantir que valor seja número
    setRegistros(preview.map((r, idx) => ({
      ...r,
      incluir: true,
      id: `reg-${idx}`,
      valor: typeof r.valor === 'number' ? r.valor : parseFloat(r.valor) || 0,
    })));

    // Se já temos categorias iniciais, usar elas, senão buscar da API
    if (categoriasIniciais.length > 0) {
      setCategorias(categoriasIniciais);
    } else {
      // Buscar categorias
      fetch('/api/categories')
        .then((res) => res.json())
        .then((data) => setCategorias(data))
        .catch((err) => console.error('Erro ao buscar categorias:', err));
    }

    // Buscar tags
    fetch('/api/tags')
      .then((res) => res.json())
      .then((data) => setTags(data))
      .catch((err) => console.error('Erro ao buscar tags:', err));
  }, [preview, categoriasIniciais]);

  function handleEdit(index: number, field: string, value: any) {
    setRegistros((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  }

  async function handleCreateCategory(name: string, categoryType: string) {
    try {
      // Converter string para o tipo esperado
      const type = categoryType === 'INCOME' ? 'INCOME' : 'EXPENSE';
      
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type }),
      });

      if (response.ok) {
        const result = await response.json();
        setCategorias((prev) => [...prev, result]);
        return result;
      }
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
    }
  }

  async function handleCreateTag(tagName: string) {
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tagName }),
      });

      if (response.ok) {
        const result = await response.json();
        setTags((prev) => [...prev, result]);
        return result;
      }
    } catch (error) {
      console.error('Erro ao criar tag:', error);
    }
  }

  function handleAcceptAISuggestion(index: number) {
    const registro = registros[index];
    if (!registro.categoriaSugerida) return;

    // Se a IA já identificou uma categoria existente (tem categoriaId)
    if (registro.categoriaId) {
      handleEdit(index, 'categoriaId', registro.categoriaId);
    } else {
      // Se não tem categoriaId, procurar na lista de categorias
      const existingCategory = categorias.find(
        (cat) => cat.name.toLowerCase() === registro.categoriaSugerida.toLowerCase()
      );

      if (existingCategory) {
        handleEdit(index, 'categoriaId', existingCategory.id);
      } else {
        // Se não existe, marcar como categoria a ser criada
        handleEdit(index, 'categoriaId', registro.categoriaSugerida);
      }
    }

    // Limpar sugestão após aceitar
    handleEdit(index, 'categoriaSugerida', '');
  }

  function handleRejectAISuggestion(index: number) {
    handleEdit(index, 'categoriaSugerida', '');
  }

  // Função para normalizar descrições em massa
  const handleNormalizeAllDescriptions = () => {
    setRegistros((prev) =>
      prev.map((r) => ({
        ...r,
        descricao: r.descricaoMelhorada || r.descricao,
      }))
    );
  };

  // Verificar se já existem registros para o período
  const checkExistingBill = async () => {
    if (!selectedCreditCard || !billPeriod) {
      return null;
    }

    setIsChecking(true);
    
    const [year, month] = billPeriod.split('-').map(Number);
    
    try {
      const response = await fetch('/api/importar-fatura/check-existing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creditCardId: selectedCreditCard,
          year: year,
          month: month,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao verificar fatura existente');
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('Erro ao verificar conflitos:', error);
      return null;
    } finally {
      setIsChecking(false);
    }
  };

  async function handleSave() {
    // Verificar se já existe fatura para o período
    const conflictCheck = await checkExistingBill();

    if (conflictCheck && conflictCheck.hasConflict) {
      // Mostrar modal de conflito
      setConflictData(conflictCheck);
      setShowConflictModal(true);
    } else {
      // Não há conflitos, segue para a confirmação de categorias novas (se houver)
      maybeConfirmCategoriesThenSave(false);
    }
  }

  function maybeConfirmCategoriesThenSave(
    deleteExisting: boolean,
    categoryDecisions?: Record<string, CategoryDecision>,
  ) {
    if (!categoryDecisions) {
      const pending = collectPendingNewCategories(registros);
      if (pending.length > 0) {
        setPendingNewCategories(pending);
        setPendingDeleteExisting(deleteExisting);
        setShowCategoryConfirm(true);
        return;
      }
    }
    processSave(deleteExisting, categoryDecisions);
  }

  const processSave = async (
    deleteExisting: boolean,
    categoryDecisions?: Record<string, CategoryDecision>,
  ) => {
    // Aplica as decisões da tela de confirmação (renomear ou não criar)
    if (categoryDecisions) {
      for (const registro of registros) {
        if (!registro.categoriaId && registro.categoriaSugerida && registro.isNewCategory) {
          const decision = categoryDecisions[registro.categoriaSugerida];
          if (decision) {
            if (decision.skip) {
              registro.categoriaSugerida = '';
              registro.isNewCategory = false;
            } else {
              registro.categoriaSugerida = decision.name;
            }
          }
        }
      }
    }

    // Processar criação de categorias e tags antes de salvar
    for (const registro of registros) {
      // Se usuário não selecionou categoria e existe recomendação da IA
      if (!registro.categoriaId && registro.categoriaSugerida && registro.isNewCategory) {
        try {
          const categoryType = registro.valor < 0 ? 'INCOME' : 'EXPENSE';
          const newCategory = await handleCreateCategory(registro.categoriaSugerida, categoryType);
          if (newCategory) {
            registro.categoriaId = newCategory.id;
            registro.isNewCategory = false;
          }
        } catch (error) {
          console.error('Erro ao criar categoria automaticamente:', error);
        }
      } else if (!registro.categoriaId && registro.categoriaSugerida && !registro.isNewCategory) {
        // Se categoria já existe, apenas definir o nome para o backend resolver
        registro.categoriaId = registro.categoriaSugerida;
      }
      // Tags não são mais sugeridas/criadas automaticamente: o usuário escolhe
      // e cria as suas próprias na tabela (ver seletor de tags na linha).
    }

    onSave(registros, deleteExisting);
  };

  const handleConfirmDelete = () => {
    // Usuário confirmou a exclusão, seguir para confirmação de categorias (se houver)
    setShowConflictModal(false);
    maybeConfirmCategoriesThenSave(true);
  };

  const handleCancelDelete = () => {
    // Usuário cancelou, fechar modal
    setShowConflictModal(false);
    setConflictData(null);
  };

  function handleConfirmCategories(decisions: Record<string, CategoryDecision>) {
    setShowCategoryConfirm(false);
    const deleteExisting = pendingDeleteExisting;
    setPendingDeleteExisting(false);
    processSave(deleteExisting, decisions);
  }

  function handleCancelCategoryConfirm() {
    setShowCategoryConfirm(false);
    setPendingNewCategories([]);
    setPendingDeleteExisting(false);
  }

  // Calcular totais separados para despesas e créditos
  const totalDespesas = registros.reduce((acc, r) => {
    if (!r.incluir) return acc;
    const valor = typeof r.valor === 'number' ? r.valor : parseFloat(r.valor) || 0;
    return valor > 0 ? acc + valor : acc; // Apenas valores positivos
  }, 0);

  const totalCreditos = registros.reduce((acc, r) => {
    if (!r.incluir) return acc;
    const valor = typeof r.valor === 'number' ? r.valor : parseFloat(r.valor) || 0;
    return valor < 0 ? acc + Math.abs(valor) : acc; // Apenas valores negativos (em positivo)
  }, 0);

  const totalFinal = totalDespesas - totalCreditos;
  const count = registros.filter((r) => r.incluir).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">Pré-visualização dos dados</h2>
        <Badge className="bg-primary/15 text-primary">
          <Sparkles className="w-4 h-4 mr-1" />
          IA Ativada
        </Badge>
      </div>
      
      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
          <Info className="w-4 h-4" />
          <span>
            A IA analisou suas transações de cartão e sugeriu categorias automaticamente.
            Revise as sugestões antes de salvar.
          </span>
        </div>
      </div>

      {/* Tabela de transações - PRIMEIRO */}
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
                    className="h-8 px-3 text-xs text-chart-5 hover:bg-chart-5/10 hover:text-chart-5 transition-colors border border-chart-5/30 hover:border-chart-5/50"
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
              <FaturaTransactionRow
                key={row.id || i}
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

      {/* Configurações e resumo - DEPOIS da tabela */}
      <div className="bg-card border rounded-lg p-6 space-y-6">
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm text-foreground/90">
          <strong>📅 Período da Fatura:</strong> Selecione o mês/ano da fatura que está importando. 
          Transações com datas fora deste período serão marcadas como antecipadas automaticamente.
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="creditCard" className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4" />
              Selecione o Cartão de Crédito
            </Label>
            <Select
              id="creditCard"
              value={selectedCreditCard}
              onChange={(e) => onCreditCardChange(e.target.value)}
              className="w-full"
              required
            >
              <option value="">-- Selecione --</option>
              {creditCards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name} - Limite: R$ {Number(card.limit || 0).toFixed(2)}
                </option>
              ))}
            </Select>
          </div>
          
          <div>
            <MonthSelector
              value={billPeriod}
              onChange={onBillPeriodChange}
              className="w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Transações:</span>
            <span className="ml-2 font-semibold">{count}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Despesas:</span>
            <span className="ml-2 font-semibold text-destructive">
              R$ {totalDespesas.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Créditos:</span>
            <span className="ml-2 font-semibold text-success">
              R$ {totalCreditos.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center text-base font-semibold">
            <span className="text-muted-foreground">Total da Fatura:</span>
            <span className={totalFinal >= 0 ? 'text-destructive' : 'text-success'}>
              R$ {Math.abs(totalFinal).toFixed(2)}
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-success/10 text-success px-4 py-3 rounded-lg">
            ✓ Fatura importada com sucesso!
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={!selectedCreditCard || saving || success || isChecking}
          className="w-full"
          size="lg"
        >
          {isChecking ? 'Verificando registros existentes...' : (saving ? 'Salvando...' : 'Salvar Fatura')}
        </Button>
      </div>

      {/* Modal de confirmação de exclusão */}
      <ConflictResolutionModal
        open={showConflictModal}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        loading={saving}
        conflicts={conflictData?.conflicts || []}
        totalConflicts={conflictData?.totalConflicts || 0}
      />

      {/* Confirmação em lote de categorias novas antes de salvar */}
      <CategoryConfirmationModal
        open={showCategoryConfirm}
        categories={pendingNewCategories}
        onConfirm={handleConfirmCategories}
        onCancel={handleCancelCategoryConfirm}
        loading={saving}
      />
    </div>
  );
}
