import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { WalletCreateModal } from '@/components/ui/wallet-create-modal';
import { ConflictResolutionModal } from '@/components/ui/conflict-resolution-modal';
import { Plus, FileText, Package, TrendingUp, TrendingDown } from 'lucide-react';
import { useState } from 'react';

interface ImportSummaryProps {
  wallets: any[];
  selectedWallet: string;
  onWalletChange: (walletId: string) => void;
  onSave: (saldoAnterior?: number, deleteExisting?: boolean) => void;
  saving: boolean;
  error: string | null;
  success: boolean;
  fetchWallets?: () => Promise<void>;
  
  // Dados das transações
  totalFiles: number;
  totalTransactions: number;
  totalIncome: number;
  totalExpense: number;
  firstTransactionDate?: Date | null;
  
  // Períodos dos extratos para verificação
  uploadedFiles?: Array<{
    file: File;
    id: string;
    preview?: any[];
  }>;
}

export function ImportSummary({
  wallets,
  selectedWallet,
  onWalletChange,
  onSave,
  saving,
  error,
  success,
  fetchWallets,
  totalFiles,
  totalTransactions,
  totalIncome,
  totalExpense,
  firstTransactionDate,
  uploadedFiles
}: ImportSummaryProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [saldoAnterior, setSaldoAnterior] = useState<string>('');
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Função para converter data de string para Date
  const parseTransactionDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    
    if (dateString.includes('/')) {
      const [d, m, y] = dateString.split('/');
      return new Date(Number(y), Number(m) - 1, Number(d));
    } else if (dateString.includes('-')) {
      return new Date(dateString);
    } else if (dateString.length === 8 && /^\d{8}$/.test(dateString)) {
      const year = Number(dateString.substring(0, 4));
      const month = Number(dateString.substring(4, 6)) - 1;
      const day = Number(dateString.substring(6, 8));
      return new Date(year, month, day);
    }
    
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  };

  // Função para verificar registros existentes
  const checkExistingRecords = async () => {
    if (!selectedWallet || !uploadedFiles || uploadedFiles.length === 0) {
      return null;
    }

    setIsChecking(true);
    
    try {
      // Extrair períodos de cada arquivo
      const periods = uploadedFiles
        .filter(f => f.preview && f.preview.length > 0)
        .map(file => {
          const transactions = file.preview!;
          
          const validDates = transactions
            .map(t => parseTransactionDate(t.data))
            .filter(Boolean) as Date[];

          if (validDates.length === 0) return null;

          const startDate = new Date(Math.min(...validDates.map(d => d.getTime())));
          const endDate = new Date(Math.max(...validDates.map(d => d.getTime())));

          return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            sourceFile: file.file.name,
          };
        })
        .filter(Boolean);

      if (periods.length === 0) {
        return null;
      }

      // Fazer verificação na API
      const response = await fetch('/api/importar-extrato/check-existing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periods,
          walletId: selectedWallet,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao verificar registros existentes');
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

  const handleSaveWithBalance = async () => {
    // Verificar registros existentes antes de salvar
    const conflictCheck = await checkExistingRecords();
    
    if (conflictCheck && conflictCheck.hasConflict) {
      // Mostrar modal de conflito
      setConflictData(conflictCheck);
      setShowConflictModal(true);
    } else {
      // Não há conflitos, prosseguir com o salvamento
      const saldoValue = saldoAnterior ? parseFloat(saldoAnterior) : undefined;
      onSave(saldoValue, false); // Passa saldoAnterior e deleteExisting
    }
  };

  const handleConfirmDelete = () => {
    // Usuário confirmou a exclusão, prosseguir com o salvamento
    const saldoValue = saldoAnterior ? parseFloat(saldoAnterior) : undefined;
    setShowConflictModal(false);
    onSave(saldoValue, true); // Passa saldoAnterior e deleteExisting
  };

  const handleCancelDelete = () => {
    // Usuário cancelou, fechar modal
    setShowConflictModal(false);
    setConflictData(null);
  };

  return (
    <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 border-t shadow-lg">
      <div className="space-y-4">
        {/* Resumo das transações */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-lg font-bold text-blue-600">{totalFiles}</div>
                <div className="text-xs text-blue-600">
                  {totalFiles === 1 ? 'Arquivo' : 'Arquivos'}
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="p-3 bg-purple-50 border-purple-200">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-600" />
              <div>
                <div className="text-lg font-bold text-purple-600">{totalTransactions}</div>
                <div className="text-xs text-purple-600">Transações</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-3 bg-green-50 border-green-200">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-lg font-bold text-green-600">
                  {totalIncome.toLocaleString('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL', 
                    minimumFractionDigits: 0 
                  })}
                </div>
                <div className="text-xs text-green-600">Receitas</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-3 bg-red-50 border-red-200">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <div>
                <div className="text-lg font-bold text-red-600">
                  {totalExpense.toLocaleString('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL', 
                    minimumFractionDigits: 0 
                  })}
                </div>
                <div className="text-xs text-red-600">Despesas</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Seleção de carteira e saldo */}
        <div className="space-y-3">
          <Label className="font-medium">Selecione a carteira para vincular os lançamentos:</Label>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Linha 1: Seletor de carteira e botão criar */}
            <div className="flex gap-2 items-center flex-1">
              <Select value={selectedWallet} onChange={(e) => onWalletChange(e.target.value)} className="flex-1">
                <option value="">Selecione uma carteira...</option>
                {wallets.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)} className="flex-shrink-0">
                <Plus className="w-4 h-4 mr-2" />
                Criar carteira
              </Button>
            </div>
            
            {/* Linha 2: Campo de saldo (aparecer ao lado quando uma carteira é selecionada) */}
            {selectedWallet && firstTransactionDate && !isNaN(firstTransactionDate.getTime()) && (
              <div className="flex flex-col gap-2 flex-1 lg:max-w-xs">
                <Label className="text-sm font-medium">
                  Saldo do dia anterior a {firstTransactionDate.toLocaleDateString('pt-BR')}:
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Saldo anterior (opcional)"
                  value={saldoAnterior}
                  onChange={(e) => setSaldoAnterior(e.target.value)}
                  className="w-full"
                />
              </div>
            )}
          </div>
          
          {/* Observações - sempre abaixo quando saldo está visível */}
          {selectedWallet && firstTransactionDate && !isNaN(firstTransactionDate.getTime()) && (
            <div className="space-y-1 text-xs">
              <p className="text-muted-foreground">
                Esse valor será lançado como receita com categoria "Saldo" na data do primeiro lançamento.
              </p>
              <p className="text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200 inline-block">
                ⚠️ Apenas caso seja a primeira importação dessa carteira
              </p>
            </div>
          )}
        </div>

        {/* Botão de importação */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div>
            <p className="font-medium">
              Pronto para importar {totalTransactions} transações
            </p>
            <p className="text-sm text-muted-foreground">
              {totalFiles === 1 
                ? 'de 1 arquivo para a carteira selecionada'
                : `de ${totalFiles} arquivos para a carteira selecionada`
              }
            </p>
          </div>
          
          <Button 
            onClick={handleSaveWithBalance}
            disabled={!selectedWallet || saving || isChecking || totalTransactions === 0}
            size="lg"
            className="w-full sm:w-auto"
          >
            {isChecking ? 'Verificando...' : saving ? 'Importando...' : `Importar ${totalTransactions} Transações`}
          </Button>
        </div>

        {/* Modal de criação de carteira */}
        <WalletCreateModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={async (id: string) => {
            setCreateOpen(false);
            if (id && typeof id === 'string' && id.length) {
              if (fetchWallets) await fetchWallets();
              onWalletChange(id);
            }
          }}
        />

        {/* Modal de conflito de registros */}
        {conflictData && (
          <ConflictResolutionModal
            open={showConflictModal}
            onConfirm={handleConfirmDelete}
            onCancel={handleCancelDelete}
            loading={saving}
            conflicts={conflictData.periods || []}
            totalConflicts={conflictData.totalConflicts || 0}
          />
        )}

        {/* Mensagens de erro/sucesso */}
        {error && (
          <div className="text-red-600 text-sm p-2 bg-red-50 border border-red-200 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="text-green-600 text-sm p-2 bg-green-50 border border-green-200 rounded">
            Importação realizada com sucesso!
          </div>
        )}
      </div>
    </div>
  );
}