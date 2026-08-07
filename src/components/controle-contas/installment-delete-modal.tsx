'use client';

import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

export type InstallmentDeleteMode = 'single' | 'future' | 'all';

interface InstallmentDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (mode: InstallmentDeleteMode) => void;
  billName: string;
  installmentNumber: number;
  installmentCount: number;
  loading?: boolean;
}

export function InstallmentDeleteModal({
  open,
  onClose,
  onConfirm,
  billName,
  installmentNumber,
  installmentCount,
  loading,
}: InstallmentDeleteModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Excluir Conta Parcelada" size="sm">
      <p className="text-sm text-muted-foreground mb-4">
        <strong className="text-foreground">{billName}</strong> — parcela {installmentNumber} de {installmentCount}
      </p>

      <div className="space-y-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => onConfirm('single')}
          className="w-full text-left p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-accent/50 transition-all group disabled:opacity-60"
        >
          <div className="font-medium text-foreground group-hover:text-primary">
            1. Excluir apenas esta parcela
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Remove só a parcela {installmentNumber}/{installmentCount}. As demais continuam normalmente.
          </div>
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => onConfirm('future')}
          className="w-full text-left p-4 rounded-lg border-2 border-border hover:border-chart-4 hover:bg-chart-4/10 transition-all group disabled:opacity-60"
        >
          <div className="font-medium text-foreground group-hover:text-chart-4">
            2. Excluir esta e as próximas parcelas
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Remove a parcela {installmentNumber} em diante. As anteriores permanecem.
          </div>
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => onConfirm('all')}
          className="w-full text-left p-4 rounded-lg border-2 border-border hover:border-destructive hover:bg-destructive/10 transition-all group disabled:opacity-60"
        >
          <div className="font-medium text-foreground group-hover:text-destructive">
            3. Excluir todas as parcelas
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Remove completamente a série, todas as {installmentCount} parcelas.
          </div>
        </button>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
      </div>
    </Modal>
  );
}
