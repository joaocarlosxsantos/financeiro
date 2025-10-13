'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowRight, Loader2 } from 'lucide-react';

interface Wallet {
  id: string;
  name: string;
  type: string;
}

interface TransferFormProps {
  onSuccess?: () => void;
}

export function TransferForm({ onSuccess }: TransferFormProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [fromWalletId, setFromWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [date, setDate] = useState('');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingWallets, setIsLoadingWallets] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchWallets();
    // Definir data atual como padrão
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    setDate(todayString);
  }, []);

  const fetchWallets = async () => {
    try {
      const response = await fetch('/api/wallets');
      if (response.ok) {
        const data = await response.json();
        setWallets(data.wallets || []);
      } else {
        setError('Erro ao carregar carteiras');
      }
    } catch (error) {
      setError('Erro ao carregar carteiras');
    } finally {
      setIsLoadingWallets(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!amount || !fromWalletId || !toWalletId) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    if (fromWalletId === toWalletId) {
      setError('Selecione carteiras diferentes para origem e destino');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (numericAmount <= 0) {
      setError('O valor deve ser maior que zero');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          description: description || undefined,
          fromWalletId,
          toWalletId,
          date: date || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Transferência realizada com sucesso!');
        // Limpar formulário
        setAmount('');
        setDescription('');
        setFromWalletId('');
        setToWalletId('');
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        setDate(todayString);
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(data.error || 'Erro ao realizar transferência');
      }
    } catch (error) {
      setError('Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  const fromWallet = wallets.find(w => w.id === fromWalletId);
  const toWallet = wallets.find(w => w.id === toWalletId);

  if (isLoadingWallets) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Carregando carteiras...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          💸 Nova Transferência entre Contas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Valor *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Input
              id="description"
              placeholder="Ex: Transferência para poupança"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fromWalletId">Carteira de Origem *</Label>
              <select
                id="fromWalletId"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={fromWalletId}
                onChange={(e) => setFromWalletId(e.target.value)}
                required
              >
                <option value="">Selecione a carteira de origem</option>
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name} ({wallet.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="toWalletId">Carteira de Destino *</Label>
              <select
                id="toWalletId"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={toWalletId}
                onChange={(e) => setToWalletId(e.target.value)}
                required
              >
                <option value="">Selecione a carteira de destino</option>
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name} ({wallet.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {fromWallet && toWallet && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{fromWallet.name}</span>
                  <span className="text-gray-500">({fromWallet.type})</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <div className="flex items-center gap-2">
                  <span className="font-medium">{toWallet.name}</span>
                  <span className="text-gray-500">({toWallet.type})</span>
                </div>
              </div>
              {amount && (
                <div className="text-center mt-2">
                  <span className="text-lg font-bold text-blue-600">
                    R$ {parseFloat(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Realizando Transferência...
              </>
            ) : (
              'Realizar Transferência'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}