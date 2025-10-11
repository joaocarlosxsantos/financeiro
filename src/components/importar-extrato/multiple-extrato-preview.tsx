'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ExtratoPreview } from './extrato-preview';
import { FileText, Package, TrendingUp, TrendingDown } from 'lucide-react';

interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'parsing' | 'ready' | 'error';
  preview?: any[];
  error?: string;
  progress?: number;
}

interface MultipleExtratoPreviewProps {
  files: UploadedFile[];
  wallets: any[];
  selectedWallet: string;
  onWalletChange: (walletId: string) => void;
  onSave: (allTransactions: any[]) => void;
  saving: boolean;
  error: string | null;
  success: boolean;
  fetchWallets?: () => Promise<void> | void;
}

export function MultipleExtratoPreview({
  files,
  wallets,
  selectedWallet,
  onWalletChange,
  onSave,
  saving,
  error,
  success,
  fetchWallets
}: MultipleExtratoPreviewProps) {
  const [activeTab, setActiveTab] = useState('consolidado');
  const [editedFiles, setEditedFiles] = useState<Record<string, any[]>>({});

  // Consolidar todas as transações
  const allTransactions = files.reduce((acc, file) => {
    const transactions = editedFiles[file.id] || file.preview || [];
    return [
      ...acc, 
      ...transactions.map((t: any) => ({ ...t, sourceFile: file.file.name }))
    ];
  }, [] as any[]);

  // Estatísticas consolidadas
  const stats = {
    totalFiles: files.length,
    totalTransactions: allTransactions.length,
    totalIncome: allTransactions
      .filter((t: any) => t.valor > 0)
      .reduce((acc: number, t: any) => acc + t.valor, 0),
    totalExpense: allTransactions
      .filter((t: any) => t.valor < 0)
      .reduce((acc: number, t: any) => acc + Math.abs(t.valor), 0),
    dateRange: {
      start: allTransactions.length > 0 
        ? new Date(Math.min(...allTransactions.map((t: any) => new Date(t.data).getTime())))
        : null,
      end: allTransactions.length > 0 
        ? new Date(Math.max(...allTransactions.map((t: any) => new Date(t.data).getTime())))
        : null
    }
  };

  const handleFileEdited = (fileId: string, editedTransactions: any[]) => {
    setEditedFiles(prev => ({
      ...prev,
      [fileId]: editedTransactions
    }));
  };

  const handleSaveAll = () => {
    onSave(allTransactions);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho com Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arquivos</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalFiles}</div>
            <p className="text-xs text-muted-foreground">Extratos processados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transações</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">Total de lançamentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground">Entradas consolidadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.totalExpense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground">Saídas consolidadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Período das Transações */}
      {stats.dateRange.start && stats.dateRange.end && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Período das Transações</h3>
                <p className="text-sm text-muted-foreground">
                  {stats.dateRange.start.toLocaleDateString('pt-BR')} até {stats.dateRange.end.toLocaleDateString('pt-BR')}
                </p>
              </div>
              <Badge variant="outline">
                {Math.ceil((stats.dateRange.end.getTime() - stats.dateRange.start.getTime()) / (1000 * 60 * 60 * 24))} dias
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Abas para visualização */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${files.length + 1}, 1fr)` }}>
          <TabsTrigger value="consolidado">
            Consolidado ({allTransactions.length})
          </TabsTrigger>
          {files.map((file) => (
            <TabsTrigger key={file.id} value={file.id}>
              {file.file.name.length > 20 
                ? `${file.file.name.substring(0, 17)}...`
                : file.file.name
              } ({file.preview?.length || 0})
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Aba Consolidada */}
        <TabsContent value="consolidado" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Visão Consolidada</h3>
              <p className="text-sm text-muted-foreground">
                Todas as transações de {files.length} arquivo(s) consolidadas
              </p>
            </div>
          </div>

          <ExtratoPreview
            preview={allTransactions}
            wallets={wallets}
            selectedWallet={selectedWallet}
            onWalletChange={onWalletChange}
            onSave={handleSaveAll}
            saving={saving}
            error={error}
            success={success}
            fetchWallets={fetchWallets ? async () => { await fetchWallets(); } : undefined}
          />
        </TabsContent>

        {/* Abas Individuais por Arquivo */}
        {files.map((file) => (
          <TabsContent key={file.id} value={file.id} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{file.file.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {file.preview?.length || 0} transações neste arquivo
                </p>
              </div>
            </div>

            <ExtratoPreview
              preview={file.preview || []}
              wallets={wallets}
              selectedWallet={selectedWallet}
              onWalletChange={onWalletChange}
              onSave={(editedTransactions) => handleFileEdited(file.id, editedTransactions)}
              saving={false}
              error={null}
              success={false}
              fetchWallets={fetchWallets ? async () => { await fetchWallets(); } : undefined}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Botão de Salvar Global */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 border-t">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div>
            <p className="font-medium">
              Pronto para importar {allTransactions.length} transações
            </p>
            <p className="text-sm text-muted-foreground">
              de {files.length} arquivo(s) para a carteira selecionada
            </p>
          </div>
          
          <Button 
            onClick={handleSaveAll}
            disabled={!selectedWallet || saving || allTransactions.length === 0}
            size="lg"
            className="w-full sm:w-auto"
          >
            {saving ? 'Salvando...' : `Importar ${allTransactions.length} Transações`}
          </Button>
        </div>
      </div>
    </div>
  );
}