import React from 'react';
import { Modal } from './modal';
import { Button } from './button';
import { AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';

interface AlertModalProps {
  open: boolean;
  title?: string;
  message: string;
  type?: 'error' | 'success' | 'warning' | 'info';
  onClose: () => void;
  confirmText?: string;
}

export function AlertModal({
  open,
  title,
  message,
  type = 'info',
  onClose,
  confirmText = 'Ok',
}: AlertModalProps) {
  const getIcon = () => {
    switch (type) {
      case 'error':
        return <XCircle className="h-12 w-12 text-red-600 dark:text-red-400 mx-auto" />;
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto" />;
      case 'warning':
        return <AlertCircle className="h-12 w-12 text-amber-600 dark:text-amber-400 mx-auto" />;
      case 'info':
      default:
        return <Info className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto" />;
    }
  };

  const getDefaultTitle = () => {
    if (title) return title;
    switch (type) {
      case 'error':
        return 'Erro';
      case 'success':
        return 'Sucesso';
      case 'warning':
        return 'Atenção';
      case 'info':
      default:
        return 'Informação';
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={getDefaultTitle()} size="sm">
      <div className="space-y-4">
        <div className="py-4">
          {getIcon()}
        </div>
        <div className="text-base text-center text-gray-700 dark:text-gray-300">
          {message}
        </div>
        <div className="flex justify-center mt-6">
          <Button onClick={onClose} className="min-w-[100px]">
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
