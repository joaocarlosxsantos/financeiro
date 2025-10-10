'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Trash2, Plus, CreditCard as CreditCardIcon } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Loader } from '@/components/ui/loader';
import { Progress } from '@/components/ui/progress';

interface CreditCard {
  id: string;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  bankId?: string;
  bank?: {
    id: string;
    name: string;
  };
  usedAmount?: number;
  availableLimit?: number;
  usagePercentage?: number;
}

interface Wallet {
  id: string;
  name: string;
  type: string;
}

interface CreditCardsContentProps {
  onCreated?: (id: string) => void;
}

export function CreditCardsContent({ onCreated }: CreditCardsContentProps) {
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [bankId, setBankId] = useState('');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [errors, setErrors] = useState<{ 
    name?: string; 
    limit?: string; 
    closingDay?: string; 
    dueDay?: string; 
  }>({});



  // Função para carregar carteiras (bancos)
  const loadWallets = async () => {
    try {
      const res = await fetch('/api/wallets', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        // Filtrar apenas carteiras do tipo BANK
        const banks = data.filter((wallet: Wallet) => wallet.type === 'BANK');
        setWallets(banks);
      }
    } catch (err) {
      console.error('Erro ao carregar carteiras:', err);
    }
  };

  // Função para carregar cartões de crédito
  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/credit-cards', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setCreditCards(data);
      } else {
        setError('Erro ao carregar cartões de crédito');
      }
    } catch (err) {
      setError('Erro ao carregar cartões de crédito');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadWallets();
  }, []);

  const resetForm = () => {
    setName('');
    setLimit('');
    setClosingDay('');
    setDueDay('');
    setBankId('');
    setErrors({});
    setEditingId(null);
  };

  const handleEdit = (creditCard: CreditCard) => {
    setName(creditCard.name);
    setLimit(creditCard.limit.toString());
    setClosingDay(creditCard.closingDay.toString());
    setDueDay(creditCard.dueDay.toString());
    setBankId(creditCard.bankId || '');
    setEditingId(creditCard.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validações básicas
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!limit || parseFloat(limit) < 0) newErrors.limit = 'Limite deve ser maior ou igual a zero';
    if (!closingDay || parseInt(closingDay) < 1 || parseInt(closingDay) > 31) {
      newErrors.closingDay = 'Dia de fechamento deve estar entre 1 e 31';
    }
    if (!dueDay || parseInt(dueDay) < 1 || parseInt(dueDay) > 31) {
      newErrors.dueDay = 'Dia de vencimento deve estar entre 1 e 31';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const cardData = {
      name: name.trim(),
      limit: parseFloat(limit),
      closingDay: parseInt(closingDay),
      dueDay: parseInt(dueDay),
      bankId: bankId || undefined,
    };

    try {
      const url = editingId ? `/api/credit-cards/${editingId}` : '/api/credit-cards';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData),
      });

      if (res.ok) {
        const newCard = await res.json();
        if (editingId) {
          setCreditCards(prev => prev.map(c => c.id === editingId ? { ...c, ...newCard } : c));
        } else {
          setCreditCards(prev => [...prev, newCard]);
          if (onCreated) onCreated(newCard.id);
        }
        setShowForm(false);
        resetForm();
        load(); // Recarregar para pegar os dados atualizados com usage
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Erro ao salvar cartão');
      }
    } catch (err) {
      setError('Erro ao salvar cartão');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cartão de crédito?')) {
      return;
    }

    try {
      const res = await fetch(`/api/credit-cards/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setCreditCards(prev => prev.filter(c => c.id !== id));
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Erro ao excluir cartão');
      }
    } catch (err) {
      setError('Erro ao excluir cartão');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">Cartões de Crédito</h1>
          <p className="text-gray-600 dark:text-foreground">Gerencie seus cartões de crédito e limites</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Cartão
        </Button>
      </div>

      {/* Modal de formulário */}
      <Modal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          resetForm();
        }}
        title={editingId ? 'Editar Cartão' : 'Novo Cartão'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do Cartão</Label>
            <Input
              id="name"
              type="text"
              placeholder="Ex: Nubank, Inter, C6 Bank..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label htmlFor="limit">Limite (R$)</Label>
            <Input
              id="limit"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className={errors.limit ? 'border-red-500' : ''}
            />
            {errors.limit && <p className="text-red-500 text-sm mt-1">{errors.limit}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="closingDay">Dia de Fechamento</Label>
              <Input
                id="closingDay"
                type="number"
                min="1"
                max="31"
                placeholder="Ex: 15"
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)}
                className={errors.closingDay ? 'border-red-500' : ''}
              />
              {errors.closingDay && <p className="text-red-500 text-sm mt-1">{errors.closingDay}</p>}
            </div>

            <div>
              <Label htmlFor="dueDay">Dia de Vencimento</Label>
              <Input
                id="dueDay"
                type="number"
                min="1"
                max="31"
                placeholder="Ex: 10"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className={errors.dueDay ? 'border-red-500' : ''}
              />
              {errors.dueDay && <p className="text-red-500 text-sm mt-1">{errors.dueDay}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="bankId">Banco (Opcional)</Label>
            <select
              id="bankId"
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-background text-foreground"
            >
              <option value="">Nenhum banco selecionado</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              {editingId ? 'Atualizar' : 'Criar'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Mensagem de erro */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setError(null)}
                className="ml-auto"
              >
                ✕
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de cartões com tratamento de erro e recarregar */}
      {isLoading && <Loader text="Carregando cartões..." />}

      {!isLoading && creditCards.length === 0 && !error && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CreditCardIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Nenhum cartão cadastrado
              </h3>
              <p className="text-gray-600 dark:text-foreground mb-4">
                Comece criando seu primeiro cartão de crédito
              </p>
              <Button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Cartão
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid de cartões */}
      {!isLoading && creditCards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {creditCards.map((creditCard) => (
            <Card key={creditCard.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCardIcon className="h-5 w-5" />
                    {creditCard.name}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(creditCard)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(creditCard.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Informações básicas */}
                <div className="space-y-2 text-sm">
                  {creditCard.bank && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-foreground">Banco:</span>
                      <span className="font-medium">{creditCard.bank.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-foreground">Fechamento:</span>
                    <span className="font-medium">Dia {creditCard.closingDay}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-foreground">Vencimento:</span>
                    <span className="font-medium">Dia {creditCard.dueDay}</span>
                  </div>
                </div>

                {/* Limite e uso */}
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Limite Total</span>
                    <span className="text-sm font-bold">{formatCurrency(creditCard.limit)}</span>
                  </div>
                  
                  {creditCard.usagePercentage !== undefined && (
                    <>
                      <Progress 
                        value={creditCard.usagePercentage} 
                        className="h-2 mb-2"
                        indicatorClassName={getUsageColor(creditCard.usagePercentage)}
                      />
                      <div className="flex justify-between text-xs text-gray-600 dark:text-foreground">
                        <span>Usado: {formatCurrency(creditCard.usedAmount || 0)}</span>
                        <span>Disponível: {formatCurrency(creditCard.availableLimit || creditCard.limit)}</span>
                      </div>
                      <div className="text-center mt-1">
                        <span className={`text-xs font-medium ${
                          creditCard.usagePercentage >= 90 ? 'text-red-600' :
                          creditCard.usagePercentage >= 70 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {creditCard.usagePercentage.toFixed(1)}% utilizado
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Botão de recarregar em caso de erro */}
      {error && (
        <div className="text-center">
          <Button variant="outline" onClick={load}>
            Tentar Novamente
          </Button>
        </div>
      )}
    </div>
  );
}