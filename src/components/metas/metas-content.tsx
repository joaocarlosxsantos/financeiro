'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ArrowRight, Calendar, Plus, Target } from 'lucide-react';
import { CheckCircle, Clock, AlertTriangle, XCircle, TrendingUp } from 'lucide-react';
import { Loader } from '@/components/ui/loader';
import { useMonth } from '@/components/providers/month-provider';
import GoalCard from '@/components/metas/GoalCard';
import GoalForm from '@/components/metas/GoalForm';

interface Goal {
  id: string;
  title: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  category: string;
  status: 'ACTIVE' | 'COMPLETED' | 'OVERDUE' | 'PAUSED';
  progress: number;
  createdAt: string;
  updatedAt: string;
}

interface MetasContentProps {
  onCreated?: (id: string) => void;
}

export function MetasContent({ onCreated }: MetasContentProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('todas');
  const [openForm, setOpenForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

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

  // Função para carregar metas
  const fetchGoals = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const monthParam = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      const res = await fetch(`/api/goals?month=${monthParam}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setGoals(data);
      } else {
        setError('Erro ao carregar metas');
      }
    } catch (err) {
      setError('Erro ao carregar metas');
    } finally {
      setIsLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // Calcular estatísticas
  const totalGoals = goals.length;
  const completedGoals = goals.filter(goal => goal.status === 'COMPLETED').length;
  const activeGoals = goals.filter(goal => goal.status === 'ACTIVE').length;
  const overdueGoals = goals.filter(goal => goal.status === 'OVERDUE').length;

  // Filtrar metas por aba
  const getFilteredGoals = () => {
    switch (activeTab) {
      case 'ativas':
        return goals.filter(goal => goal.status === 'ACTIVE');
      case 'concluidas':
        return goals.filter(goal => goal.status === 'COMPLETED');
      case 'atrasadas':
        return goals.filter(goal => goal.status === 'OVERDUE');
      default:
        return goals;
    }
  };

  const renderGoalsList = () => {
    const filteredGoals = getFilteredGoals();
    
    if (filteredGoals.length === 0) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="h-12 w-12 text-gray-300 dark:text-foreground mx-auto mb-4" />
            <p className="text-gray-500 dark:text-foreground">
              {activeTab === 'todas' ? 'Nenhuma meta cadastrada' : `Nenhuma meta ${activeTab}`}
            </p>
            <Button className="mt-4" onClick={() => {
              setEditingGoal(null);
              setOpenForm(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              {activeTab === 'todas' ? 'Criar Primeira Meta' : 'Nova Meta'}
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredGoals.map((goal) => (
          <GoalCard 
            key={goal.id} 
            goal={goal} 
            onClick={(goal) => { 
              setEditingGoal(goal); 
              setOpenForm(true); 
            }} 
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Padronizado */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Metas</h1>
        <p className="text-muted-foreground">Defina e acompanhe suas metas financeiras</p>
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
          setEditingGoal(null);
          setOpenForm(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Meta
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Metas</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalGoals}</div>
            <p className="text-xs text-muted-foreground">Metas cadastradas</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedGoals}</div>
            <p className="text-xs text-muted-foreground">Metas finalizadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{activeGoals}</div>
            <p className="text-xs text-muted-foreground">Metas ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueGoals}</div>
            <p className="text-xs text-muted-foreground">Prazo vencido</p>
          </CardContent>
        </Card>
      </div>

      {/* Sistema de Abas */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="todas" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Todas
          </TabsTrigger>
          <TabsTrigger value="ativas" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Ativas
          </TabsTrigger>
          <TabsTrigger value="concluidas" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Concluídas
          </TabsTrigger>
          <TabsTrigger value="atrasadas" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Atrasadas
          </TabsTrigger>
        </TabsList>

        {/* Conteúdo das Abas */}
        <TabsContent value="todas" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Todas as Metas</h3>
            <p className="text-sm text-muted-foreground">Visualize todas as suas metas financeiras</p>
          </div>
          {renderGoalsList()}
        </TabsContent>

        <TabsContent value="ativas" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Metas Ativas</h3>
            <p className="text-sm text-muted-foreground">Metas em andamento que você está trabalhando</p>
          </div>
          {renderGoalsList()}
        </TabsContent>

        <TabsContent value="concluidas" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Metas Concluídas</h3>
            <p className="text-sm text-muted-foreground">Parabéns! Metas que você já alcançou</p>
          </div>
          {renderGoalsList()}
        </TabsContent>

        <TabsContent value="atrasadas" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Metas Atrasadas</h3>
            <p className="text-sm text-muted-foreground">Metas que precisam de atenção especial</p>
          </div>
          {renderGoalsList()}
        </TabsContent>
      </Tabs>

      {/* Estados de Loading e Erro */}
      {isLoading && <Loader text="Carregando metas..." />}
      {error && (
        <div className="text-red-500 text-center">
          {error}
          <Button className="ml-2" size="sm" onClick={fetchGoals}>
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Modal de formulário */}
      {openForm && (
        <GoalForm
          initial={editingGoal ?? undefined}
          onClose={() => { 
            setOpenForm(false); 
            setEditingGoal(null); 
          }}
          onSaved={() => { 
            setOpenForm(false); 
            setEditingGoal(null); 
            fetchGoals();
            if (onCreated && !editingGoal) {
              // Se criou uma nova meta, chama o callback
              onCreated('new-goal');
            }
          }}
        />
      )}
    </div>
  );
}