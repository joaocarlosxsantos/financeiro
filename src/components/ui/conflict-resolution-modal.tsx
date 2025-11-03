'use client';

import React from 'react';
import { Modal } from './modal';
import { Button } from './button';
import { AlertTriangle, FileText, Calendar } from 'lucide-react';

interface PeriodConflict {
  startDate: string;
  endDate: string;
  sourceFile?: string;
  count: number;
  incomesCount: number;
  expensesCount: number;
  hasConflict: boolean;
}

interface ConflictResolutionModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  conflicts: PeriodConflict[];
  totalConflicts: number;
}

export function ConflictResolutionModal({
  open,
  onConfirm,
  onCancel,
  loading = false,
  conflicts,
  totalConflicts,
}: ConflictResolutionModalProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };

  const conflictingPeriods = conflicts.filter(c => c.hasConflict);

  return (
    <Modal open={open} onClose={onCancel} title="⚠️ Registros Existentes Encontrados" size="md">
      <div className="space-y-4">
        {/* Alerta principal */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900">
              {totalConflicts} registro{totalConflicts !== 1 ? 's' : ''} já exist{totalConflicts !== 1 ? 'em' : 'e'} no período
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              Encontramos registros já cadastrados na carteira selecionada nos períodos dos extratos que você está importando.
            </p>
          </div>
        </div>

        {/* Detalhes dos conflitos */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {conflictingPeriods.map((period, index) => (
            <div 
              key={index} 
              className="p-3 bg-gray-50 border border-gray-200 rounded-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  {period.sourceFile && (
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700 truncate" title={period.sourceFile}>
                        {period.sourceFile}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {formatDate(period.startDate)} até {formatDate(period.endDate)}
                    </span>
                  </div>

                  <div className="flex gap-4 text-xs text-gray-600 mt-2">
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                      {period.incomesCount} receita{period.incomesCount !== 1 ? 's' : ''}
                    </span>
                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded">
                      {period.expensesCount} despesa{period.expensesCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <div className="text-2xl font-bold text-amber-600">
                    {period.count}
                  </div>
                  <div className="text-xs text-gray-500 text-center">
                    registro{period.count !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pergunta */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900">
            O que você deseja fazer?
          </p>
          <ul className="mt-2 text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li><strong>Excluir e Importar:</strong> Remove os registros existentes e importa os novos</li>
            <li><strong>Cancelar:</strong> Mantém os registros atuais e cancela a importação</li>
          </ul>
        </div>

        {/* Botões */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end mt-6">
          <Button 
            variant="outline" 
            onClick={onCancel} 
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={loading}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700"
          >
            {loading ? 'Excluindo e importando...' : `Excluir ${totalConflicts} e Importar`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
