import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

export interface ConfirmDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  description?: string;
}

export function ConfirmDeleteModal({ open, onClose, onConfirm, description }: ConfirmDeleteModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Confirmar exclusão">
      <div className="py-4">
        <p className="mb-4 text-foreground/90">
          Tem certeza que deseja excluir esta transação?
        </p>
        {description && (
          <div className="mb-4 p-2 bg-muted rounded text-foreground">
            {description}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm}>Excluir</Button>
        </div>
      </div>
    </Modal>
  );
}
