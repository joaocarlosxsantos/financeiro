'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select } from '@/components/ui/select';
import { CategoryCreateModal } from '@/components/ui/category-create-modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMonth } from '@/components/providers/month-provider';
import { Edit, Trash2, Plus, Tag, ArrowLeft, ArrowRight, Calendar, FolderOpen, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
import { Loader } from '@/components/ui/loader';

interface Category {
  id: string;
  name: string;
  color: string;
  type: 'EXPENSE' | 'INCOME' | 'BOTH';
  icon?: string;
}

interface CategoriasContentProps {
  onCreated?: (id: string) => void;
}

export function CategoriasContent({ onCreated }: CategoriasContentProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('todas');
  const [monthSelectorOpen, setMonthSelectorOpen] = useState(false);
  const { currentDate, setCurrentDate } = useMonth();

  const [showForm, setShowForm] = useState(false);
  const [formInitial, setFormInitial] = useState<{ id?: string; name?: string; color?: string; type?: 'EXPENSE' | 'INCOME' | 'BOTH'; icon?: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Navegação de mês
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    const now = new Date();
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    if (nextMonth <= now) {
      setCurrentDate(nextMonth);
    }
  };
  
  const handleDateChange = (year: number, month: number) => {
    setCurrentDate(new Date(year, month - 1, 1));
    setMonthSelectorOpen(false);
  };

  const monthLabel = currentDate.toLocaleString('pt-BR', { month: 'long' });
  const monthLabelCapitalized = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  const yearLabel = currentDate.getFullYear();
  
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

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/categories', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Função para resetar o formulário
  const resetForm = (cat?: Category) => {
    setEditingId(cat ? cat.id : null);
    setFormInitial(cat ? { id: cat.id, name: cat.name, color: cat.color, type: cat.type, icon: cat.icon } : null);
    setTimeout(() => setShowForm(true), 0);
  };

  const handleEdit = (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (cat) {
      resetForm(cat);
    }
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeleteLoading(true);
    setDeleteError(null);
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    setDeleteLoading(false);
    if (res.ok) {
      setCategories(categories.filter((c) => c.id !== id));
      setDeleteId(null);
    } else {
      const error = await res.json();
      setDeleteError(error.error || 'Erro ao excluir categoria');
    }
  };



  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'EXPENSE':
        return 'Despesa';
      case 'INCOME':
        return 'Renda';
      case 'BOTH':
        return 'Ambos';
      default:
        return type;
    }
  };

  // Calcular estatísticas das categorias
  const getFilteredCategories = () => {
    switch (activeTab) {
      case 'despesas':
        return categories.filter(cat => cat.type === 'EXPENSE' || cat.type === 'BOTH');
      case 'rendas':
        return categories.filter(cat => cat.type === 'INCOME' || cat.type === 'BOTH');
      default:
        return categories;
    }
  };

  const getCategoryStats = () => {
    const expenseCategories = categories.filter(cat => cat.type === 'EXPENSE' || cat.type === 'BOTH').length;
    const incomeCategories = categories.filter(cat => cat.type === 'INCOME' || cat.type === 'BOTH').length;
    const bothCategories = categories.filter(cat => cat.type === 'BOTH').length;
    
    return {
      total: categories.length,
      despesas: expenseCategories,
      rendas: incomeCategories,
      ambas: bothCategories
    };
  };

  const stats = getCategoryStats();
  const filteredCategories = getFilteredCategories();

  // Função para renderizar a lista de categorias
  const renderCategoriesList = (categoriesToRender: Category[]) => {
    if (isLoading) {
      return <Loader text="Carregando categorias..." />;
    }

    if (categoriesToRender.length === 0) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <Tag className="h-12 w-12 text-gray-400 dark:text-foreground mx-auto mb-4" />
            <p className="text-gray-500 dark:text-foreground">
              {activeTab === 'todas' ? 'Nenhuma categoria cadastrada' 
               : activeTab === 'despesas' ? 'Nenhuma categoria de despesas cadastrada'
               : 'Nenhuma categoria de rendas cadastrada'}
            </p>
        <Button className="mt-4" onClick={() => resetForm(undefined)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeira Categoria
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {categoriesToRender.map((category) => (
          <Card key={category.id}>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-lg truncate">
                      {category.icon && `${category.icon} `}{category.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-foreground">
                      {getTypeLabel(category.type)}
                    </p>
                  </div>
                </div>

                <div className="flex space-x-2 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(category.id)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setDeleteId(category.id)}
                    disabled={category.name === 'Transferência entre Contas' && category.type === 'BOTH'}
                    title={category.name === 'Transferência entre Contas' && category.type === 'BOTH' ? 'Esta categoria não pode ser excluída' : undefined}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
      {/* Modal de confirmação de exclusão */}
      <ConfirmModal
        open={!!deleteId}
        title="Excluir categoria"
        description={deleteError ? deleteError : 'Tem certeza que deseja excluir esta categoria? Essa ação não poderá ser desfeita.'}
        confirmText="Excluir"
        cancelText="Cancelar"
        loading={deleteLoading}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => { setDeleteId(null); setDeleteError(null); }}
      />
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Categorias</h1>
        <p className="text-muted-foreground">Gerencie suas categorias de despesas e rendas</p>
      </div>

      {/* Header com navegação de mês */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevMonth}
            aria-label="Mês anterior"
            className="h-10 w-10 rounded-full border border-slate-300/60 dark:border-white/15 bg-white/40 dark:bg-slate-700/40 hover:bg-white/60 dark:hover:bg-slate-700/60 shadow-sm backdrop-blur-sm"
          >
            <ArrowLeft className="h-5 w-5 stroke-[2.5] text-slate-700 dark:text-slate-200" />
          </Button>
          
          <Popover open={monthSelectorOpen} onOpenChange={setMonthSelectorOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-10 px-4 min-w-[160px] justify-between border border-slate-300/70 bg-white/90 hover:bg-white text-slate-900 shadow-sm backdrop-blur-sm dark:bg-slate-800/60 dark:border-white/15 dark:text-slate-100 dark:hover:bg-slate-800/80"
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                  <span className="font-medium text-sm sm:text-base">{monthLabelCapitalized} {yearLabel}</span>
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

          <Button
            variant="outline"
            size="icon"
            onClick={handleNextMonth}
            aria-label="Próximo mês"
            className="h-10 w-10 rounded-full border border-slate-300/60 dark:border-white/15 bg-white/40 dark:bg-slate-700/40 hover:bg-white/60 dark:hover:bg-slate-700/60 shadow-sm backdrop-blur-sm"
          >
            <ArrowRight className="h-5 w-5 stroke-[2.5] text-slate-700 dark:text-slate-200" />
          </Button>
        </div>
        
  <Button onClick={() => resetForm(undefined)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Categorias</CardTitle>
            <FolderOpen className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.total}
            </div>
            <p className="text-xs text-muted-foreground">
              Categorias cadastradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Para Despesas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.despesas}
            </div>
            <p className="text-xs text-muted-foreground">
              Categorias de gastos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Para Rendas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.rendas}
            </div>
            <p className="text-xs text-muted-foreground">
              Categorias de ganhos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uso Misto</CardTitle>
            <Tag className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.ambas}
            </div>
            <p className="text-xs text-muted-foreground">
              Ambos os tipos
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="todas" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Todas
          </TabsTrigger>
          <TabsTrigger value="despesas" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Despesas
          </TabsTrigger>
          <TabsTrigger value="rendas" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Rendas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todas" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Todas as Categorias</h3>
            <p className="text-sm text-muted-foreground">
              Visualize e gerencie todas as suas categorias
            </p>
          </div>
          {renderCategoriesList(filteredCategories)}
        </TabsContent>

        <TabsContent value="despesas" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Categorias de Despesas</h3>
            <p className="text-sm text-muted-foreground">
              Categorias utilizadas para classificar seus gastos
            </p>
          </div>
          {renderCategoriesList(filteredCategories)}
        </TabsContent>

        <TabsContent value="rendas" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Categorias de Rendas</h3>
            <p className="text-sm text-muted-foreground">
              Categorias utilizadas para classificar seus ganhos
            </p>
          </div>
          {renderCategoriesList(filteredCategories)}
        </TabsContent>
      </Tabs>

      {/* Modal de criar/editar categoria */}
      {showForm && (
        <CategoryCreateModal
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
            // reload categories
            const res = await fetch('/api/categories', { cache: 'no-store' });
            if (res.ok) {
              const data = await res.json();
              setCategories(data);
            }
            if (onCreated && id) onCreated(id);
          }}
          initial={formInitial}
        />
      )}
    </div>
  );
}
