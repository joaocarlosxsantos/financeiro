"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, CreditCard } from 'lucide-react';
import { TransactionRow } from '@/components/importar-extrato/transaction-row';

interface FaturaPreviewProps {
  preview: any[];
  creditCards: any[];
  selectedCreditCard: string;
  onCreditCardChange: (id: string) => void;
  onSave: (registros: any[]) => void;
  saving: boolean;
  error: string | null;
  success: boolean;
}

export function FaturaPreview({
  preview,
  creditCards,
  selectedCreditCard,
  onCreditCardChange,
  onSave,
  saving,
  error,
  success,
}: FaturaPreviewProps) {
  const [registros, setRegistros] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);

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

  function handleSave() {
    onSave(registros);
  }

  const total = registros.reduce((acc, r) => {
    const valor = typeof r.valor === 'number' ? r.valor : parseFloat(r.valor) || 0;
    return acc + (r.incluir ? valor : 0);
  }, 0);
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

      {/* Tabela de transações */}
      <div className="overflow-x-auto rounded-lg border border-border bg-background shadow-sm">
        <table className="min-w-full">
          <thead>
            <tr className="bg-muted text-muted-foreground">
              <th className="px-4 py-4 text-left font-semibold w-28">Data</th>
              <th className="px-4 py-4 text-right font-semibold w-32">Valor</th>
              <th className="px-4 py-4 text-left font-semibold min-w-[350px]">Descrição</th>
              <th className="px-4 py-4 text-left font-semibold min-w-[180px]">Categoria</th>
              <th className="px-4 py-4 text-left font-semibold min-w-[160px]">Tags</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((row, i) => (
              <TransactionRow
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

      {/* Resumo e seleção de cartão */}
      <div className="bg-card border rounded-lg p-6 space-y-6">
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
                {card.name} - Limite: R$ {card.limit?.toFixed(2) || '0.00'}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Transações:</span>
            <span className="ml-2 font-semibold">{count}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total:</span>
            <span className="ml-2 font-semibold">
              R$ {Math.abs(total).toFixed(2)}
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
    </div>
  );
}
