"use client";

import { useState, useEffect } from 'react';
import { Loader } from '@/components/ui/loader';
import { Toast } from '@/components/ui/toast';

import { ExtratoUpload } from '@/components/importar-extrato/extrato-upload';
import { ExtratoPreview } from '@/components/importar-extrato/extrato-preview';
import { MultipleExtratoPreview } from '@/components/importar-extrato/multiple-extrato-preview';
import { ImportNotificationsPanel } from '@/components/importar-extrato/import-notifications-panel';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import PageTitle from '@/components/PageTitle';
import { useImportNotifications } from '@/hooks/use-import-notifications';

interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'parsing' | 'ready' | 'error';
  preview?: any[];
  error?: string;
  progress?: number;
}

export default function ImportarExtratoPage() {
  // Estados principais
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [wallets, setWallets] = useState<any[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { addNotification } = useImportNotifications();

  // Função para processar arquivos individuais
  const processFile = async (file: File): Promise<UploadedFile> => {
    const uploadedFile: UploadedFile = {
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      status: 'uploading'
    };

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/importar-extrato/parse', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erro ao processar arquivo');
      }

      const { preview } = await response.json();
      return { ...uploadedFile, status: 'ready', preview };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return { ...uploadedFile, status: 'error', error: errorMessage };
    }
  };

  // Função para processar todos os arquivos
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    setIsProcessing(true);
    setError(null);

    try {
      if (files.length === 1) {
        addNotification('info', 'Processamento Iniciado', 'Processando arquivo...');
      } else {
        addNotification('info', 'Processamento Iniciado', `Processando ${files.length} arquivos...`);
      }

      // Processar arquivos em lotes para não sobrecarregar
      const batchSize = 3;
      const processedFiles: UploadedFile[] = [];

      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(processFile));
        processedFiles.push(...batchResults);
      }

      setUploadedFiles(processedFiles);

      // Verificar resultados
      const successFiles = processedFiles.filter(f => f.status === 'ready');
      const errorFiles = processedFiles.filter(f => f.status === 'error');

      if (successFiles.length > 0) {
        const totalTransactions = successFiles.reduce((acc, file) => acc + (file.preview?.length || 0), 0);
        addNotification('success', 'Processamento Concluído', 
          `${successFiles.length} arquivo(s) processado(s) com ${totalTransactions} transações`);
        setStep('preview');
      }

      if (errorFiles.length > 0) {
        addNotification('error', 'Erros no Processamento', 
          `${errorFiles.length} arquivo(s) apresentaram erro`);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      addNotification('error', 'Erro no Processamento', 'Falha ao processar arquivos');
    } finally {
      setIsProcessing(false);
    }
  };

  // Função para salvar (pode ser individual ou múltiplo)
  const handleSave = async (registrosEditados?: any[]) => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const isMultiple = uploadedFiles.length > 1;
      const endpoint = isMultiple ? '/api/importar-extrato/batch' : '/api/importar-extrato/save';
      
      let requestBody;
      
      if (isMultiple) {
        // Preparar dados para processamento em lote
        const allTransactions = uploadedFiles
          .filter(f => f.status === 'ready')
          .flatMap(f => f.preview || [])
          .map(transaction => ({
            ...transaction,
            walletId: selectedWallet
          }));

        requestBody = {
          transactions: allTransactions,
          walletId: selectedWallet
        };
      } else {
        // Processamento individual
        const transactions = registrosEditados || uploadedFiles[0]?.preview || [];
        requestBody = {
          registros: transactions,
          walletId: selectedWallet
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar transações');
      }

      setSuccess(true);
      setShowToast(true);
      
      if (isMultiple) {
        addNotification('success', 'Importação Iniciada', 
          'O processamento continuará em segundo plano');
      } else {
        addNotification('success', 'Transações Salvas', 
          'Transações importadas com sucesso');
      }

      // Reset para o estado inicial
      setTimeout(() => {
        setStep('upload');
        setFiles([]);
        setUploadedFiles([]);
        setSelectedWallet('');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      addNotification('error', 'Erro ao Salvar', 'Falha ao salvar transações');
    } finally {
      setSaving(false);
    }
  };

  const resetToUpload = () => {
    setStep('upload');
    setFiles([]);
    setUploadedFiles([]);
    setSelectedWallet('');
    setError(null);
    setSuccess(false);
  };

  useEffect(() => {
    if (step === 'preview') {
      loadWallets();
    }
  }, [step]);

  async function loadWallets() {
    try {
      const res = await fetch('/api/wallets');
      if (res.ok) {
        const data = await res.json();
        setWallets(data);
      }
    } catch (error) {
      console.error('Erro ao carregar carteiras:', error);
    }
  }

  const isMultipleFiles = uploadedFiles.length > 1;

  return (
    <DashboardLayout>
      <PageTitle module="Controle Financeiro" page="Importar Extrato" />
      <div className="space-y-6">
        {/* Painel de Notificações */}
        <ImportNotificationsPanel />
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Importar Extrato</h1>
            <p className="text-muted-foreground">
              Importe um ou vários arquivos OFX de extratos bancários
            </p>
          </div>
          
          {step === 'preview' && (
            <button
              onClick={resetToUpload}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              ← Voltar para upload
            </button>
          )}
        </div>

        {step === 'upload' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">
              Upload de Extratos com Processamento Otimizado
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
              • Selecione um ou vários arquivos de extrato<br/>
              • Processamento otimizado para não travar o sistema<br/>
              • Metas atualizadas apenas após todo o processamento<br/>
              • Visualização consolidada de todas as transações
            </p>
          </div>
        )}

        {step === 'upload' && (
          <div className="max-w-2xl mx-auto">
            {isProcessing && <Loader text="Processando arquivos..." />}
            {!isProcessing && (
              <ExtratoUpload
                onFilesChange={setFiles}
                onSubmit={handleSubmit}
                files={files}
                disabled={isProcessing}
                multiple={true}
              />
            )}
          </div>
        )}

        {step === 'preview' && (
          <>
            {isMultipleFiles ? (
              <MultipleExtratoPreview
                files={uploadedFiles}
                wallets={wallets}
                selectedWallet={selectedWallet}
                onWalletChange={setSelectedWallet}
                onSave={handleSave}
                saving={saving}
                error={error}
                success={success}
                fetchWallets={loadWallets}
              />
            ) : (
              <ExtratoPreview
                preview={uploadedFiles[0]?.preview || []}
                wallets={wallets}
                selectedWallet={selectedWallet}
                onWalletChange={setSelectedWallet}
                onSave={handleSave}
                saving={saving}
                error={error}
                success={success}
                fetchWallets={loadWallets}
              />
            )}
          </>
        )}

        <Toast
          open={showToast}
          message={
            isMultipleFiles 
              ? "Importação iniciada! O processamento continuará em segundo plano."
              : "Extrato enviado com sucesso!"
          }
          onClose={() => setShowToast(false)}
        />
      </div>
    </DashboardLayout>
  );
}