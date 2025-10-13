'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowRight, Trash2, Loader2 } from 'lucide-react';

interface Transfer {
  id: string;
  amount: number;
  description: string;
  date: string;
  fromWallet: {
    id: string;
    name: string;
    type: string;
  };
  toWallet: {
    id: string;
    name: string;
    type: string;
  };
  createdAt: string;
}

interface TransferListProps {
  refreshTrigger?: number;
}

export function TransferList({ refreshTrigger }: TransferListProps) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTransfers();
  }, [refreshTrigger]);

  const fetchTransfers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/transfers');
      if (response.ok) {
        const data = await response.json();
        setTransfers(data.transfers || []);
      } else {
        setError('Erro ao carregar transferências');
      }
    } catch (error) {
      setError('Erro ao carregar transferências');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (transferId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta transferência?')) {
      return;
    }

    setDeletingId(transferId);
    try {
      const response = await fetch(`/api/transfers/${transferId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTransfers(transfers.filter(t => t.id !== transferId));
      } else {
        const data = await response.json();
        alert(data.error || 'Erro ao excluir transferência');
      }
    } catch (error) {
      alert('Erro de conexão');
    } finally {
      setDeletingId(null);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Carregando transferências...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📋 Histórico de Transferências
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transfers.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            Nenhuma transferência encontrada
          </div>
        ) : (
          <div className="space-y-4">
            {transfers.map((transfer) => (
              <div
                key={transfer.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{transfer.fromWallet.name}</span>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{transfer.toWallet.name}</span>
                      </div>
                      <div className="text-lg font-bold text-blue-600">
                        {formatCurrency(transfer.amount)}
                      </div>
                    </div>
                    
                    {transfer.description && (
                      <p className="text-gray-600 text-sm mb-2">{transfer.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Data: {formatDate(transfer.date)}</span>
                      <span>Criado em: {formatDate(transfer.createdAt)}</span>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(transfer.id)}
                    disabled={deletingId === transfer.id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {deletingId === transfer.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}