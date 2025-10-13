'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Loader2 } from 'lucide-react';
import { getWalletTypeLabel } from '@/lib/wallet-utils';

interface Wallet {
  id: string;
  name: string;
  type: string;
}

interface QuickTransferFormProps {
  onSuccess?: () => void;
}

export default function QuickTransferForm({ onSuccess }: QuickTransferFormProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [fromWalletId, setFromWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingWallets, setIsLoadingWallets] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      const response = await fetch('/api/wallets');
      if (response.ok) {
        const data = await response.json();
        setWallets(Array.isArray(data) ? data : data.wallets || []);
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

    if (!amount || !date || !fromWalletId || !toWalletId) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    if (fromWalletId === toWalletId) {
      setError('Selecione carteiras diferentes');
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
          date: date,
          fromWalletId,
          toWalletId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Transferência realizada!');
        
        // Limpar formulário
        setAmount('');
        setDescription('');
        setDate(new Date().toISOString().split('T')[0]);
        setFromWalletId('');
        setToWalletId('');
        
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
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Carregando carteiras...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded text-sm">
          {success}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="quick-amount" className="text-sm">Valor *</Label>
          <Input
            id="quick-amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="h-9"
          />
        </div>

        <div>
          <Label htmlFor="quick-date" className="text-sm">Data *</Label>
          <Input
            id="quick-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="h-9"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="quick-description" className="text-sm">Descrição</Label>
        <Input
          id="quick-description"
          placeholder="Opcional"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-9"
        />
      </div>

      <div>
        <Label htmlFor="quick-from-wallet" className="text-sm">De *</Label>
        <select
          id="quick-from-wallet"
          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-9 text-sm"
          value={fromWalletId}
          onChange={(e) => setFromWalletId(e.target.value)}
          required
        >
          <option value="">Carteira de origem</option>
          {wallets.map((wallet) => (
            <option key={wallet.id} value={wallet.id}>
              {wallet.name} ({getWalletTypeLabel(wallet.type)})
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="quick-to-wallet" className="text-sm">Para *</Label>
        <select
          id="quick-to-wallet"
          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-9 text-sm"
          value={toWalletId}
          onChange={(e) => setToWalletId(e.target.value)}
          required
        >
          <option value="">Carteira de destino</option>
          {wallets.map((wallet) => (
            <option key={wallet.id} value={wallet.id}>
              {wallet.name} ({getWalletTypeLabel(wallet.type)})
            </option>
          ))}
        </select>
      </div>

      {fromWallet && toWallet && (
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="font-medium">{fromWallet.name}</span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <span className="font-medium">{toWallet.name}</span>
          </div>
          {amount && (
            <div className="text-center mt-1">
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                R$ {parseFloat(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-9"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Transferindo...
          </>
        ) : (
          'Transferir'
        )}
      </Button>
    </form>
  );
}