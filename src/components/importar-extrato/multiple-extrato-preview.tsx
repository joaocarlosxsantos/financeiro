'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ExtratoPreview } from './extrato-preview';
import { ImportSummary } from './import-summary';
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
  onSave: (allTransactions: any[], saldoAnterior?: number) => void;
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

  // Função para converter data de string para Date
  const parseTransactionDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    
    if (dateString.includes('/')) {
      // Formato DD/MM/YYYY
      const [d, m, y] = dateString.split('/');
      return new Date(Number(y), Number(m) - 1, Number(d));
    } else if (dateString.includes('-')) {
      // Formato ISO YYYY-MM-DD
      return new Date(dateString);
    } else if (dateString.length === 8 && /^\d{8}$/.test(dateString)) {
      // Formato YYYYMMDD
      const year = Number(dateString.substring(0, 4));
      const month = Number(dateString.substring(4, 6)) - 1; // Month is 0-indexed
      const day = Number(dateString.substring(6, 8));
      return new Date(year, month, day);
    }
    
    // Fallback para outros formatos
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  };

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
        ? (() => {
            const validDates = allTransactions
              .map((t: any) => parseTransactionDate(t.data))
              .filter(Boolean) as Date[];
            return validDates.length > 0 
              ? new Date(Math.min(...validDates.map(d => d.getTime())))
              : null;
          })()
        : null,
      end: allTransactions.length > 0 
        ? (() => {
            const validDates = allTransactions
              .map((t: any) => parseTransactionDate(t.data))
              .filter(Boolean) as Date[];
            return validDates.length > 0 
              ? new Date(Math.max(...validDates.map(d => d.getTime())))
              : null;
          })()
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

  const handleSaveAllWithBalance = (saldoAnterior?: number) => {
    let transactionsWithBalance = [...allTransactions];
    
    // Adicionar saldo anterior se informado
    if (saldoAnterior && stats.dateRange.start && !isNaN(saldoAnterior) && saldoAnterior !== 0) {
      // Data do saldo: um dia antes da primeira transação
      const dataSaldo = new Date(stats.dateRange.start);
      dataSaldo.setDate(dataSaldo.getDate() - 1);
      
      const saldoInicial = {
        data: dataSaldo.toISOString().split('T')[0], // Formato YYYY-MM-DD
        valor: saldoAnterior,
        descricao: 'Saldo inicial',
        descricaoSimplificada: 'Saldo inicial',
        categoriaId: 'Saldo',
        categoriaSugerida: 'Saldo',
        tags: [],
        isSaldoInicial: true,
        sourceFile: 'Sistema'
      };
      
      transactionsWithBalance = [saldoInicial, ...transactionsWithBalance];
    }
    
    onSave(allTransactions, saldoAnterior);
  };

  const getCurrentTabInfo = () => {
    if (activeTab === 'consolidado') {
      return { name: 'Consolidado', count: allTransactions.length, index: 0 };
    }
    const fileIndex = files.findIndex(f => f.id === activeTab);
    const file = files.find(f => f.id === activeTab);
    return { 
      name: file?.file.name || 'Arquivo', 
      count: file?.preview?.length || 0, 
      index: fileIndex + 1 
    };
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho com Estatísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={stats.totalFiles > 5 ? 'border-blue-200 bg-blue-50/50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arquivos</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalFiles}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalFiles > 5 ? 'Muitos extratos' : 'Extratos processados'}
            </p>
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

      {/* Resumo detalhado quando há muitos arquivos */}
      {files.length > 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumo dos Arquivos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-40 overflow-y-auto">
              {files.map((file, index) => (
                <div key={file.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" title={file.file.name}>
                        {file.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {file.preview?.length || 0} transações
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => setActiveTab(file.id)}
                      className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-colors"
                    >
                      Ver
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Abas para visualização - Otimizada para muitos arquivos */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Indicador da aba ativa quando há muitos arquivos */}
        {files.length > 5 && (
          <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                <span className="text-sm font-medium">Visualizando:</span>
                <span className="text-sm text-primary font-semibold">{getCurrentTabInfo().name}</span>
                <Badge variant="secondary" className="text-xs">
                  {getCurrentTabInfo().count} transações
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {getCurrentTabInfo().index} de {files.length + 1}
              </div>
            </div>
          </div>
        )}
        
        <div className="relative">
          {/* Container com scroll horizontal para as abas */}
          <div 
            className="flex items-center space-x-1 overflow-x-auto pb-2 scroll-smooth" 
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'hsl(var(--muted-foreground) / 0.3) transparent',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {/* Aba Consolidada - sempre visível primeiro */}
            <button
              onClick={() => setActiveTab('consolidado')}
              className={`
                flex-shrink-0 inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium ring-offset-background transition-all
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                disabled:pointer-events-none disabled:opacity-50
                ${activeTab === 'consolidado' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }
              `}
            >
              📊 Consolidado ({allTransactions.length})
            </button>
            
            {/* Separador visual */}
            <div className="flex-shrink-0 w-px h-6 bg-border"></div>
            
            {/* Abas dos arquivos individuais */}
            {files.map((file, index) => {
              const fileName = file.file.name;
              const displayName = fileName.length > 15 
                ? `${fileName.substring(0, 12)}...${fileName.split('.').pop()}`
                : fileName;
              
              return (
                <button
                  key={file.id}
                  onClick={() => setActiveTab(file.id)}
                  className={`
                    flex-shrink-0 inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ring-offset-background transition-all
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                    disabled:pointer-events-none disabled:opacity-50
                    ${activeTab === file.id 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                    }
                  `}
                  title={`${fileName} - ${file.preview?.length || 0} transações`}
                >
                  <span className="mr-1">📄</span>
                  <span className="truncate max-w-24 sm:max-w-32">{displayName}</span>
                  <span className="ml-1 text-xs opacity-75 hidden sm:inline">({file.preview?.length || 0})</span>
                </button>
              );
            })}
          </div>
          
          {/* Indicador de scroll quando há muitos arquivos */}
          {files.length > 5 && (
            <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none flex items-center justify-end pr-1">
              <div className="text-xs text-muted-foreground">→</div>
            </div>
          )}
        </div>

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
            hideImportSummary={true}
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
              hideImportSummary={true}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Componente de resumo unificado */}
      <ImportSummary
        wallets={wallets}
        selectedWallet={selectedWallet}
        onWalletChange={onWalletChange}
        onSave={handleSaveAllWithBalance}
        saving={saving}
        error={error}
        success={success}
        fetchWallets={fetchWallets ? async () => { await fetchWallets(); } : undefined}
        totalFiles={files.length}
        totalTransactions={allTransactions.length}
        totalIncome={stats.totalIncome}
        totalExpense={stats.totalExpense}
        firstTransactionDate={stats.dateRange.start}
      />
    </div>
  );
}