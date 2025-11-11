"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, CreditCard } from 'lucide-react';
import { FaturaTransactionRow } from './fatura-transaction-row';
import { ConflictResolutionModal } from '@/components/ui/conflict-resolution-modal';

interface FaturaPreviewProps {
  preview: any[];
  creditCards: any[];
  selectedCreditCard: string;
  onCreditCardChange: (id: string) => void;
  billMonth: number;
  billYear: number;
  onBillMonthChange: (month: number) => void;
  onBillYearChange: (year: number) => void;
  onSave: (registros: any[], deleteExisting?: boolean) => void;
  saving: boolean;
  error: string | null;
  success: boolean;
}

export function FaturaPreview({
  preview,
  creditCards,
  selectedCreditCard,
  onCreditCardChange,
  billMonth,
  billYear,
  onBillMonthChange,
  onBillYearChange,
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

  useEffect(() => {
    // Inicializar registros - garantir que valor seja número
    setRegistros(preview.map((r, idx) => ({
      ...r,
      incluir: true,
      id: `reg-${idx}`,
      valor: typeof r.valor === 'number' ? r.valor : parseFloat(r.valor) || 0,
    })));

    // Buscar categorias
    fetch('/api/categorias')
      .then((res) => res.json())
      .then((data) => setCategorias(data))
      .catch((err) => console.error('Erro ao buscar categorias:', err));

    // Buscar tags
    fetch('/api/tags')
      .then((res) => res.json())
      .then((data) => setTags(data))
      .catch((err) => console.error('Erro ao buscar tags:', err));
  }, [preview]);

  function handleEdit(index: number, field: string, value: any) {
    setRegistros((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  }

  async function handleCreateCategory(name: string, categoryType: string) {
    try {
      // Converter string para o tipo esperado
      const type = categoryType === 'INCOME' ? 'INCOME' : 'EXPENSE';
      
      const response = await fetch('/api/categorias', {
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

    const existingCategory = categorias.find(
      (cat) => cat.name.toLowerCase() === registro.categoriaSugerida.toLowerCase()
    );

    if (existingCategory) {
      handleEdit(index, 'categoriaId', existingCategory.id);
    } else {
      handleEdit(index, 'categoriaId', registro.categoriaSugerida);
    }

    handleEdit(index, 'categoriaSugerida', '');
  }

  function handleRejectAISuggestion(index: number) {
    handleEdit(index, 'categoriaSugerida', '');
  }

  // Verificar se já existem registros para o período
  const checkExistingBill = async () => {
    if (!selectedCreditCard || !billMonth || !billYear) {
      return null;
    }

    setIsChecking(true);
    
    try {
      const response = await fetch('/api/importar-fatura/check-existing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creditCardId: selectedCreditCard,
          year: billYear,
          month: billMonth,
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
      // Não há conflitos, prosseguir com o salvamento
      onSave(registros, false);
    }
  }

  const handleConfirmDelete = () => {
    // Usuário confirmou a exclusão, prosseguir com o salvamento
    setShowConflictModal(false);
    onSave(registros, true);
  };

  const handleCancelDelete = () => {
    // Usuário cancelou, fechar modal
    setShowConflictModal(false);
    setConflictData(null);
  };

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
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">Pré-visualização da Fatura</h2>
        <Badge className="bg-blue-100 text-blue-800">
          <Sparkles className="w-4 h-4 mr-1" />
          IA Ativada
        </Badge>
      </div>

      {/* Configurações e resumo - ANTES da tabela */}
      <div className="bg-card border rounded-lg p-6 space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
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
            <Label htmlFor="billMonth" className="mb-2 block">
              Mês da Fatura
            </Label>
            <Select
              id="billMonth"
              value={billMonth.toString()}
              onChange={(e) => onBillMonthChange(parseInt(e.target.value))}
              className="w-full"
              required
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <option key={month} value={month}>
                  {new Date(2000, month - 1).toLocaleString('pt-BR', { month: 'long' })}
                </option>
              ))}
            </Select>
          </div>
          
          <div>
            <Label htmlFor="billYear" className="mb-2 block">
              Ano da Fatura
            </Label>
            <Select
              id="billYear"
              value={billYear.toString()}
              onChange={(e) => onBillYearChange(parseInt(e.target.value))}
              className="w-full"
              required
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Transações:</span>
            <span className="ml-2 font-semibold">{count}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Despesas:</span>
            <span className="ml-2 font-semibold text-red-600">
              R$ {totalDespesas.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Créditos:</span>
            <span className="ml-2 font-semibold text-green-600">
              R$ {totalCreditos.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center text-base font-semibold">
            <span className="text-muted-foreground">Total da Fatura:</span>
            <span className={totalFinal >= 0 ? 'text-red-600' : 'text-green-600'}>
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
          <div className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">
            ✓ Fatura importada com sucesso!
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={!selectedCreditCard || saving || success}
          className="w-full"
          size="lg"
        >
          {saving ? 'Salvando...' : 'Salvar Fatura'}
        </Button>
      </div>

      {/* Tabela de transações - DEPOIS dos controles */}
      <div className="overflow-x-auto rounded-lg border border-border bg-background shadow-sm">
        <table className="min-w-full table-fixed">
          <thead>
            <tr className="bg-muted text-muted-foreground text-xs">
              <th className="px-3 py-2 text-left font-semibold w-[100px]">Data</th>
              <th className="px-3 py-2 text-right font-semibold w-[110px]">Valor</th>
              <th className="px-3 py-2 text-left font-semibold w-[30%]">Descrição</th>
              <th className="px-3 py-2 text-left font-semibold w-[25%]">Categoria</th>
              <th className="px-3 py-2 text-left font-semibold w-[25%]">Tags</th>
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

      {/* Modal de confirmação de exclusão */}
      <ConflictResolutionModal
        open={showConflictModal}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        loading={saving}
        conflicts={conflictData?.conflicts || []}
        totalConflicts={conflictData?.totalConflicts || 0}
      />
    </div>
  );
}
