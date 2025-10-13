'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, Trash2, Plus, CreditCard as CreditCardIcon, ArrowLeft, ArrowRight, Calendar } from 'lucide-react';
import { AlertTriangle, Building2, CheckCircle, XCircle, TrendingUp, Target } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Loader } from '@/components/ui/loader';
import { Progress } from '@/components/ui/progress';
import { useMonth } from '@/components/providers/month-provider';

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
  const [activeTab, setActiveTab] = useState('todos');

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

  const { currentDate, setCurrentDate } = useMonth();

  // Funções para navegação de mês
  const handlePrevMonth = () => {
    const prev = new Date(currentDate);
    prev.setMonth(prev.getMonth() - 1);
    setCurrentDate(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
  };

  const monthLabel = currentDate.toLocaleDateString('pt-BR', { month: 'long' });
  const year = currentDate.getFullYear();



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

  // Calcular estatísticas
  const totalLimit = creditCards.reduce((acc, card) => acc + card.limit, 0);
  const totalUsed = creditCards.reduce((acc, card) => acc + (card.usedAmount || 0), 0);
  const totalAvailable = totalLimit - totalUsed;
  const highUsageCards = creditCards.filter(card => (card.usagePercentage || 0) >= 70).length;

  // Filtrar cartões por aba
  const getFilteredCards = () => {
    switch (activeTab) {
      case 'ativos':
        return creditCards.filter(card => (card.usagePercentage || 0) > 0);
      case 'inativos':
        return creditCards.filter(card => (card.usagePercentage || 0) === 0);
      case 'alto-uso':
        return creditCards.filter(card => (card.usagePercentage || 0) >= 70);
      default:
        return creditCards;
    }
  };

  const renderCardsList = () => {
    const filteredCards = getFilteredCards();
    
    if (filteredCards.length === 0) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <CreditCardIcon className="h-12 w-12 text-gray-300 dark:text-foreground mx-auto mb-4" />
            <p className="text-gray-500 dark:text-foreground">
              {activeTab === 'todos' ? 'Nenhum cartão de crédito cadastrado' : `Nenhum cartão ${activeTab}`}
            </p>
            <Button className="mt-4" onClick={() => {
              resetForm();
              setShowForm(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              {activeTab === 'todos' ? 'Adicionar Primeiro Cartão' : 'Novo Cartão'}
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCards.map((creditCard) => (
          <Card key={creditCard.id} className="shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">{creditCard.name}</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(creditCard)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(creditCard.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {creditCard.bank && (
                <p className="text-sm text-gray-500 dark:text-foreground">{creditCard.bank.name}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Limite usado</span>
                  <span className="font-medium">
                    {(creditCard.usagePercentage || 0).toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={creditCard.usagePercentage || 0}
                  className="h-2"
                />
                <div className="flex justify-between text-sm text-gray-600 dark:text-foreground">
                  <span>
                    R$ {(creditCard.usedAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <span>
                    R$ {creditCard.limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              
              <div className="pt-2 border-t space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Fechamento:</span>
                  <span>Dia {creditCard.closingDay}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Vencimento:</span>
                  <span>Dia {creditCard.dueDay}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Disponível:</span>
                  <span className="font-medium text-green-600">
                    R$ {(creditCard.availableLimit || (creditCard.limit - (creditCard.usedAmount || 0))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Padronizado */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Cartões de Crédito</h1>
        <p className="text-muted-foreground">Gerencie seus cartões de crédito e controle seus limites</p>
      </div>

      {/* Navegação de Mês + Botão Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center space-x-2 px-3 h-10 rounded-md border">
            <Calendar className="h-4 w-4" />
            <span className="capitalize">{monthLabel} {year}</span>
          </div>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
        <Button onClick={() => {
          resetForm();
          setShowForm(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cartão
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Limite Total</CardTitle>
            <Target className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              {formatCurrency(totalLimit)}
            </div>
            <p className="text-xs text-muted-foreground">Soma de todos os limites</p>
          </CardContent>
        </Card>
        

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Usado</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(totalUsed)}
            </div>
            <p className="text-xs text-muted-foreground">Total utilizado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Limite Disponível</CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalAvailable)}
            </div>
            <p className="text-xs text-muted-foreground">Total disponível para uso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alto Uso</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{highUsageCards}</div>
            <p className="text-xs text-muted-foreground">Cartões com uso ≥ 70%</p>
          </CardContent>
        </Card>
      </div>

      {/* Sistema de Abas */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="todos" className="flex items-center gap-2">
            <CreditCardIcon className="h-4 w-4" />
            Todos
          </TabsTrigger>
          <TabsTrigger value="ativos" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Ativos
          </TabsTrigger>
          <TabsTrigger value="inativos" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Inativos
          </TabsTrigger>
          <TabsTrigger value="alto-uso" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alto Uso
          </TabsTrigger>
        </TabsList>

        {/* Conteúdo das Abas */}
        <TabsContent value="todos" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Todos os Cartões</h3>
            <p className="text-sm text-muted-foreground">Visualize todos os seus cartões de crédito cadastrados</p>
          </div>
          {renderCardsList()}
        </TabsContent>

        <TabsContent value="ativos" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Cartões Ativos</h3>
            <p className="text-sm text-muted-foreground">Cartões com saldo utilizado</p>
          </div>
          {renderCardsList()}
        </TabsContent>

        <TabsContent value="inativos" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Cartões Inativos</h3>
            <p className="text-sm text-muted-foreground">Cartões sem uso no momento</p>
          </div>
          {renderCardsList()}
        </TabsContent>

        <TabsContent value="alto-uso" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Alto Uso</h3>
            <p className="text-sm text-muted-foreground">Cartões com uso igual ou superior a 70% do limite</p>
          </div>
          {renderCardsList()}
        </TabsContent>
      </Tabs>

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

      {/* Estados de Loading e Erro */}
      {isLoading && <Loader text="Carregando cartões..." />}
      {error && (
        <div className="text-red-500 text-center">
          {error}
          <Button className="ml-2" size="sm" onClick={load}>
            Tentar novamente
          </Button>
        </div>
      )}
    </div>
  );
}