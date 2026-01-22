'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, Trash2, Plus, Wallet as WalletIcon, ArrowLeft, ArrowRight, Calendar, ArrowUpDown, ChevronDown } from 'lucide-react';
import { AlertTriangle, Building2, Gift, Banknote, Folder, TrendingUp } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { WalletCreateModal } from '@/components/ui/wallet-create-modal';
import { Loader } from '@/components/ui/loader';
import { useMonth } from '@/components/providers/month-provider';
import { TransferModal } from '@/components/transfers/transfer-modal';

interface Wallet {
  id: string;
  name: string;
  type: string;
  expenses: { amount: number | string }[];
  incomes: { amount: number | string }[];
  balance?: number;
}

interface CarteirasContentProps {
  onCreated?: (id: string) => void;
}

export function CarteirasContent({ onCreated }: CarteirasContentProps) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('todas');
  const [monthSelectorOpen, setMonthSelectorOpen] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [formInitial, setFormInitial] = useState<{ id?: string; name?: string; type?: string } | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('BANK');
  const [errors, setErrors] = useState<{ name?: string; type?: string }>({});

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
  
  const handleDateChange = (year: number, month: number) => {
    setCurrentDate(new Date(year, month - 1, 1));
    setMonthSelectorOpen(false);
  };

  const monthLabel = currentDate.toLocaleDateString('pt-BR', { month: 'long' });
  const year = currentDate.getFullYear();
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - 3 + i);
  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  const typeLabels: Record<string, string> = {
    BANK: 'Banco',
    VALE_BENEFICIOS: 'Vale Benefícios',
    CASH: 'Dinheiro',
    OTHER: 'Outros',
  };

  // Função para carregar carteiras (pode ser chamada manualmente)
  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/wallets', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setWallets(data);
      } else {
        setError('Erro ao carregar carteiras');
      }
    } catch {
      setError('Erro ao carregar carteiras');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleEdit = (id: string) => {
    const wallet = wallets.find((w) => w.id === id);
    if (wallet) {
      setEditingId(id);
      setFormInitial({ id, name: wallet.name, type: wallet.type });
      setShowForm(true);
    }
  };

  const handleDelete = async (id: string) => {
    // abrir modal de confirmação
    setConfirmingDelete(id);
  };

  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!confirmingDelete) return;
    const id = confirmingDelete;
    setConfirmingDelete(null);
    const res = await fetch(`/api/wallets/${id}`, { method: 'DELETE' });
    if (res.ok) setWallets((w) => w.filter((wx) => wx.id !== id));
  };

  const deletingWallet = confirmingDelete ? wallets.find((w) => w.id === confirmingDelete) : null;

  // O handleSubmit foi removido, pois o modal agora lida com submit

  // Calcular estatísticas
  const totalWallets = wallets.length;
  const activeWallets = wallets.filter(w => {
    const balance = typeof w.balance === 'number' ? w.balance : 
      (w.incomes?.reduce((acc, i) => acc + Number(i.amount), 0) || 0) - 
      (w.expenses?.reduce((acc, e) => acc + Number(e.amount), 0) || 0);
    return Math.abs(balance) >= 0.01;
  }).length;
  
  const totalBalance = wallets.reduce((acc, w) => {
    const balance = typeof w.balance === 'number' ? w.balance :
      (w.incomes?.reduce((acc, i) => acc + Number(i.amount), 0) || 0) - 
      (w.expenses?.reduce((acc, e) => acc + Number(e.amount), 0) || 0);
    return acc + balance;
  }, 0);

  const walletTypes = Array.from(new Set(wallets.map(w => w.type))).length;

  // Filtrar carteiras por aba
  const getFilteredWallets = () => {
    switch (activeTab) {
      case 'banco':
        return wallets.filter(w => w.type === 'BANK');
      case 'vale-beneficios':
        return wallets.filter(w => w.type === 'VALE_BENEFICIOS');
      case 'dinheiro':
        return wallets.filter(w => w.type === 'CASH');
      case 'outros':
        return wallets.filter(w => w.type === 'OTHER');
      default:
        return wallets;
    }
  };

  const renderWalletsList = () => {
    const filteredWallets = getFilteredWallets();
    
    if (filteredWallets.length === 0) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <WalletIcon className="h-12 w-12 text-gray-300 dark:text-foreground mx-auto mb-4" />
            <p className="text-gray-500 dark:text-foreground">
              {activeTab === 'todas' ? 'Nenhuma carteira cadastrada' : `Nenhuma carteira do tipo ${typeLabels[activeTab.toUpperCase().replace('-', '_')] || activeTab}`}
            </p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {activeTab === 'todas' ? 'Adicionar Primeira Carteira' : 'Nova Carteira'}
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-6 xl:gap-3">
        {filteredWallets
          .slice()
          .sort((a, b) => {
            const getSaldo = (wallet: Wallet) => {
              const saldoFromBackend = typeof wallet.balance === 'number' ? wallet.balance : undefined;
              const saldoFallback =
                (wallet.incomes?.reduce((acc: number, i: { amount: number | string }) => acc + Number(i.amount), 0) || 0) -
                (wallet.expenses?.reduce((acc: number, e: { amount: number | string }) => acc + Number(e.amount), 0) || 0);
              const saldoRaw = typeof saldoFromBackend === 'number' ? saldoFromBackend : saldoFallback;
              return Object.is(saldoRaw, -0) ? 0 : saldoRaw;
            };
            
            const saldoA = getSaldo(a);
            const saldoB = getSaldo(b);
            
            return saldoB - saldoA;
          })
          .map((wallet) => {
            const saldoFromBackend = typeof wallet.balance === 'number' ? wallet.balance : undefined;
            const saldoFallback =
              (wallet.incomes?.reduce((acc: number, i: { amount: number | string }) => acc + Number(i.amount), 0) || 0) -
              (wallet.expenses?.reduce((acc: number, e: { amount: number | string }) => acc + Number(e.amount), 0) || 0);
            const saldoRaw = typeof saldoFromBackend === 'number' ? saldoFromBackend : saldoFallback;
            const saldo = Object.is(saldoRaw, -0) ? 0 : saldoRaw;

            return (
              <Card key={wallet.id} className="p-2 shadow-lg rounded-xl">
                <CardContent className="flex flex-col gap-3">
                  <div className="flex justify-start">
                    <span
                      className={
                        saldo > 0
                          ? 'text-green-600 font-bold text-2xl sm:text-3xl'
                          : saldo === 0 || Math.abs(saldo) < 0.01
                          ? 'text-green-600 font-bold text-2xl sm:text-3xl'
                          : 'text-red-600 font-bold text-2xl sm:text-3xl'
                      }
                    >
                      {saldo === 0 || Math.abs(saldo) < 0.01 ? '0,00' : saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                    <WalletIcon className="h-8 w-8 text-gray-500 dark:text-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-xl truncate">{wallet.name}</h3>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 dark:text-foreground">{typeLabels[wallet.type] ?? wallet.type}</p>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(wallet.id)}>
                        <Edit className="h-5 w-5" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(wallet.id)}>
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Padronizado */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Carteiras</h1>
        <p className="text-muted-foreground">Gerencie suas carteiras e controle seus saldos</p>
      </div>

      {/* Navegação de Mês + Botão Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <Popover open={monthSelectorOpen} onOpenChange={setMonthSelectorOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-10 px-4 min-w-[160px] justify-between border border-slate-300/70 bg-white/90 hover:bg-white text-slate-900 shadow-sm backdrop-blur-sm dark:bg-slate-800/60 dark:border-white/15 dark:text-slate-100 dark:hover:bg-slate-800/80"
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                  <span className="capitalize">{monthLabel} {year}</span>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-700 dark:text-slate-200" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="year-select" className="text-sm font-medium mb-2 block">
                    Ano
                  </Label>
                  <Select
                    id="year-select"
                    value={currentDate.getFullYear().toString()}
                    onChange={(e) => {
                      const newYear = parseInt(e.target.value);
                      handleDateChange(newYear, currentDate.getMonth() + 1);
                    }}
                    className="w-full"
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="month-select" className="text-sm font-medium mb-2 block">
                    Mês
                  </Label>
                  <Select
                    id="month-select"
                    value={(currentDate.getMonth() + 1).toString()}
                    onChange={(e) => {
                      const newMonth = parseInt(e.target.value);
                      handleDateChange(currentDate.getFullYear(), newMonth);
                    }}
                    className="w-full"
                  >
                    {months.map(month => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTransferModal(true)}>
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Transferir
          </Button>
          <Button onClick={() => {
            setEditingId(null);
            setFormInitial(null);
            setShowForm(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Carteira
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Carteiras</CardTitle>
            <WalletIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalWallets}</div>
            <p className="text-xs text-muted-foreground">Carteiras cadastradas</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
            <TrendingUp className={`h-4 w-4 ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground">Soma de todas as carteiras</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carteiras Ativas</CardTitle>
            <Building2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeWallets}</div>
            <p className="text-xs text-muted-foreground">Com saldo diferente de zero</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tipos Diversos</CardTitle>
            <Folder className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{walletTypes}</div>
            <p className="text-xs text-muted-foreground">Diferentes tipos de carteira</p>
          </CardContent>
        </Card>
      </div>

      {/* Sistema de Abas */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="todas" className="flex items-center gap-2">
            <WalletIcon className="h-4 w-4" />
            Todas
          </TabsTrigger>
          <TabsTrigger value="banco" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Banco
          </TabsTrigger>
          <TabsTrigger value="vale-beneficios" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Benefícios
          </TabsTrigger>
          <TabsTrigger value="dinheiro" className="flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            Dinheiro
          </TabsTrigger>
          <TabsTrigger value="outros" className="flex items-center gap-2">
            <Folder className="h-4 w-4" />
            Outros
          </TabsTrigger>
        </TabsList>

        {/* Conteúdo das Abas */}
        <TabsContent value="todas" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Todas as Carteiras</h3>
            <p className="text-sm text-muted-foreground">Visualize todas as suas carteiras cadastradas</p>
          </div>
          {renderWalletsList()}
        </TabsContent>

        <TabsContent value="banco" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Carteiras Bancárias</h3>
            <p className="text-sm text-muted-foreground">Contas correntes, poupanças e cartões de débito</p>
          </div>
          {renderWalletsList()}
        </TabsContent>

        <TabsContent value="vale-beneficios" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Vale Benefícios</h3>
            <p className="text-sm text-muted-foreground">Vale refeição, alimentação e outros benefícios</p>
          </div>
          {renderWalletsList()}
        </TabsContent>

        <TabsContent value="dinheiro" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Dinheiro</h3>
            <p className="text-sm text-muted-foreground">Dinheiro em espécie e valores físicos</p>
          </div>
          {renderWalletsList()}
        </TabsContent>

        <TabsContent value="outros" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Outros Tipos</h3>
            <p className="text-sm text-muted-foreground">Investimentos, criptomoedas e outras modalidades</p>
          </div>
          {renderWalletsList()}
        </TabsContent>
      </Tabs>

      {/* Modal de criar/editar carteira */}
      {showForm && (
        <WalletCreateModal
          open={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingId(null);
            setFormInitial(null);
          }}
          onCreated={async (id) => {
            setShowForm(false);
            setEditingId(null);
            setFormInitial(null);
            await load();
            if (onCreated && id) onCreated(id);
          }}
          initial={formInitial}
        />
      )}

      {/* Modal de confirmação de exclusão (melhorado) */}
      {confirmingDelete && (
        <Modal open={!!confirmingDelete} onClose={() => setConfirmingDelete(null)} size="sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 flex items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-red-700">Confirmar exclusão</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Tem certeza que deseja excluir esta carteira? Esta ação é irreversível e removerá todos os
                registros relacionados.
              </p>
              {deletingWallet && (
                <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">{deletingWallet.name}</p>
              )}
              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row sm:justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmingDelete(null)} className="w-full sm:w-auto">
                  Cancelar
                </Button>
                <Button
                  onClick={confirmDelete}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
                >
                  Excluir
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Estados de Loading e Erro */}
      {isLoading && <Loader text="Carregando carteiras..." />}
      {error && (
        <div className="text-red-500 text-center">
          {error}
          <Button className="ml-2" size="sm" onClick={load}>
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Modal de Transferência */}
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onSuccess={() => {
          load(); // Recarregar carteiras após transferência
        }}
      />
    </div>
  );
}

// Nota: Modal de confirmação é renderizado dentro do componente acima via state `confirmingDelete`.
