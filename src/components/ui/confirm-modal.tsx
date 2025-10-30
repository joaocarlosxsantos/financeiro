import React from 'react';
import { Modal } from './modal';
import { Button } from './button';

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmModal({
  open,
  title = 'Confirmar',
  description = 'Tem certeza que deseja continuar?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <div className="space-y-4">
        {description && <div className="text-base text-center">{description}</div>}
        <div className="flex justify-center gap-2 mt-4">
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? 'Aguarde...' : confirmText}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {cancelText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
