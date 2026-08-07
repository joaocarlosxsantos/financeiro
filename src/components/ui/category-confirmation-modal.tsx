'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from './modal';
import { Button } from './button';
import { Input } from './input';
import { Sparkles, Tag as TagIcon, Ban, RotateCcw } from 'lucide-react';

export interface PendingNewCategory {
  /** Nome originalmente sugerido — usado como chave estável para aplicar as decisões. */
  originalName: string;
  type: 'EXPENSE' | 'INCOME';
  /** Quantos lançamentos deste lote usariam esta categoria. */
  count: number;
}

export interface CategoryDecision {
  /** Nome final a usar (pode ter sido renomeado pelo usuário). */
  name: string;
  /** Se true, a categoria não é criada e os lançamentos ficam sem categoria. */
  skip: boolean;
}

interface CategoryConfirmationModalProps {
  open: boolean;
  categories: PendingNewCategory[];
  onConfirm: (decisions: Record<string, CategoryDecision>) => void;
  onCancel: () => void;
  loading?: boolean;
}

/**
 * Tela de confirmação em lote para categorias novas identificadas durante a
 * importação de extrato/fatura. Usada tanto pelo fluxo de extrato quanto
 * pelo de fatura para manter a mesma UX nos dois lugares: a criação
 * automática continua acontecendo (não é preciso aprovar uma a uma), mas o
 * usuário vê a lista completa antes de salvar e pode renomear ou marcar
 * para não criar alguma categoria específica.
 */
export function CategoryConfirmationModal({
  open,
  categories,
  onConfirm,
  onCancel,
  loading = false,
}: CategoryConfirmationModalProps) {
  const [decisions, setDecisions] = useState<Record<string, CategoryDecision>>({});

  useEffect(() => {
    if (open) {
      const initial: Record<string, CategoryDecision> = {};
      for (const cat of categories) {
        initial[cat.originalName] = { name: cat.originalName, skip: false };
      }
      setDecisions(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const totalToCreate = categories.filter((c) => !decisions[c.originalName]?.skip).length;

  return (
    <Modal open={open} onClose={onCancel} title="Novas categorias serão criadas" size="md">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-foreground">
              {categories.length} categoria{categories.length !== 1 ? 's' : ''} nova
              {categories.length !== 1 ? 's' : ''} identificada{categories.length !== 1 ? 's' : ''}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Confira os nomes antes de salvar. Você pode renomear ou optar por não criar alguma
              delas — os lançamentos correspondentes ficarão sem categoria.
            </p>
          </div>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {categories.map((cat) => {
            const decision = decisions[cat.originalName] ?? { name: cat.originalName, skip: false };
            return (
              <div
                key={cat.originalName}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  decision.skip ? 'border-border bg-muted/40 opacity-60' : 'border-border bg-card'
                }`}
              >
                <TagIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input
                  value={decision.name}
                  disabled={decision.skip}
                  onChange={(e) =>
                    setDecisions((prev) => ({
                      ...prev,
                      [cat.originalName]: { ...decision, name: e.target.value },
                    }))
                  }
                  className="h-8 flex-1 text-sm"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
                  {cat.count} lançamento{cat.count !== 1 ? 's' : ''} ·{' '}
                  {cat.type === 'INCOME' ? 'receita' : 'despesa'}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant={decision.skip ? 'outline' : 'ghost'}
                  onClick={() =>
                    setDecisions((prev) => ({
                      ...prev,
                      [cat.originalName]: { ...decision, skip: !decision.skip },
                    }))
                  }
                  className="h-8 px-2 text-xs shrink-0"
                  title={decision.skip ? 'Voltar a criar esta categoria' : 'Não criar esta categoria'}
                >
                  {decision.skip ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Criar
                    </>
                  ) : (
                    <>
                      <Ban className="w-3.5 h-3.5 mr-1" />
                      Não criar
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onCancel} disabled={loading} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(decisions)} disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Salvando...' : `Confirmar e salvar (${totalToCreate} categoria${totalToCreate !== 1 ? 's' : ''} nova${totalToCreate !== 1 ? 's' : ''})`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
