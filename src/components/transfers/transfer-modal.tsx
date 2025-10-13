'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Loader2, X } from 'lucide-react';
import { getWalletTypeLabel } from '@/lib/wallet-utils';

interface Wallet {
  id: string;
  name: string;
  type: string;
}

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TransferModal({ isOpen, onClose, onSuccess }: TransferModalProps) {
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
  
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchWallets();
      // Definir data atual como padrão
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      setDate(todayString);
      
      // Reset form
      setAmount('');
      setDescription('');
      setFromWalletId('');
      setToWalletId('');
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  // Fechar modal com ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Fechar modal clicando fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const fetchWallets = async () => {
    try {
      setIsLoadingWallets(true);
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
        
        // Fechar modal após 1.5 segundos
        setTimeout(() => {
          onClose();
        }, 1500);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            💸 Nova Transferência
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 rounded-full p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoadingWallets ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Carregando carteiras...</span>
            </div>
          ) : (
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

              <div className="grid grid-cols-2 gap-4">
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

              <div>
                <Label htmlFor="fromWalletId">Carteira de Origem *</Label>
                <select
                  id="fromWalletId"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={fromWalletId}
                  onChange={(e) => setFromWalletId(e.target.value)}
                  required
                >
                  <option value="">Selecione a carteira de origem</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} ({getWalletTypeLabel(wallet.type)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="toWalletId">Carteira de Destino *</Label>
                <select
                  id="toWalletId"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={toWalletId}
                  onChange={(e) => setToWalletId(e.target.value)}
                  required
                >
                  <option value="">Selecione a carteira de destino</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} ({getWalletTypeLabel(wallet.type)})
                    </option>
                  ))}
                </select>
              </div>

              {fromWallet && toWallet && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{fromWallet.name}</span>
                      <span className="text-gray-500">({getWalletTypeLabel(fromWallet.type)})</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{toWallet.name}</span>
                      <span className="text-gray-500">({getWalletTypeLabel(toWallet.type)})</span>
                    </div>
                  </div>
                  {amount && (
                    <div className="text-center mt-2">
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        R$ {parseFloat(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
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
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}