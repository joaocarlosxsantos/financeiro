'use client';

import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

interface RecurringDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (deleteType: 'single' | 'stopRecurring' | 'all') => void;
  transactionDescription: string;
  occurrenceDate?: string;
}

export function RecurringDeleteModal({
  open,
  onClose,
  onConfirm,
  transactionDescription,
  occurrenceDate,
}: RecurringDeleteModalProps) {
  
  const handleOptionClick = (deleteType: 'single' | 'stopRecurring' | 'all') => {
    onConfirm(deleteType);
  };

  return (
    <Modal open={open} onClose={onClose} title="Excluir Registro Recorrente">
      <div className="py-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Este é um registro recorrente: <span className="font-medium text-foreground">{transactionDescription}</span>
        </p>
        
        {occurrenceDate && (
          <p className="text-sm text-muted-foreground">
            Ocorrência: <span className="font-medium text-foreground">{occurrenceDate}</span>
          </p>
        )}

        <p className="text-sm font-medium text-foreground">
          Como você deseja excluir este registro?
        </p>

        <div className="space-y-2">
          {/* Opção 1: Excluir apenas este */}
          <button
            onClick={() => handleOptionClick('single')}
            className="w-full text-left p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-accent/50 transition-all group"
          >
            <div className="font-medium text-foreground group-hover:text-primary">
              1. Excluir apenas este registro
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Remove apenas esta ocorrência específica. As demais continuarão normalmente.
            </div>
          </button>

          {/* Opção 2: Excluir este e parar recorrência */}
          <button
            onClick={() => handleOptionClick('stopRecurring')}
            className="w-full text-left p-4 rounded-lg border-2 border-border hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all group"
          >
            <div className="font-medium text-foreground group-hover:text-orange-600">
              2. Excluir este e parar recorrência
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Remove esta e todas as próximas ocorrências. As anteriores permanecem.
            </div>
          </button>

          {/* Opção 3: Excluir todos */}
          <button
            onClick={() => handleOptionClick('all')}
            className="w-full text-left p-4 rounded-lg border-2 border-border hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all group"
          >
            <div className="font-medium text-foreground group-hover:text-red-600">
              3. Excluir todos os registros
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Remove completamente este registro recorrente e todas as suas ocorrências.
            </div>
          </button>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

