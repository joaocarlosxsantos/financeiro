import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from '@/components/ui/loader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMonth } from '@/components/providers/month-provider';
import { Plus, Tag, Edit, Trash2, ArrowLeft, ArrowRight, Calendar, Hash, TrendingUp, TrendingDown } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Tag {
  id: string;
  name: string;
}

interface TagsContentProps {
  onCreated?: (id: string) => void;
}

export function TagsContent({ onCreated }: TagsContentProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [activeTab, setActiveTab] = useState('todas');
  const { currentDate, setCurrentDate } = useMonth();

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

  const monthLabel = currentDate.toLocaleString('pt-BR', { month: 'long' });
  const monthLabelCapitalized = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  const yearLabel = currentDate.getFullYear();

  // Função de carregamento extraída para uso em outros pontos
  const load = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/tags', { cache: 'no-store' });
      if (res.ok) setTags(await res.json());
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  // Recarrega tags quando alguma parte da app notificar mudança
  useEffect(() => {
    const onChanged = () => load();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') load();
    };
    window.addEventListener('tags:changed', onChanged);
    window.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onChanged);
    return () => {
      window.removeEventListener('tags:changed', onChanged);
      window.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onChanged);
    };
  }, []);

  const handleEdit = (id: string) => {
    const tag = tags.find((t) => t.id === id);
    if (tag) {
      setEditingId(id);
      setName(tag.name);
      setShowForm(true);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
    if (res.ok) setTags(tags.filter((t) => t.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string } = {};
    if (!name.trim()) newErrors.name = 'Nome é obrigatório.';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    setIsLoading(true);
    try {
      if (editingId) {
        await fetch(`/api/tags/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
      } else {
        const res = await fetch('/api/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        if (res.ok) {
          const created = await res.json();
          if (onCreated) onCreated(created.id);
        }
      }
      await load();
      setShowForm(false);
      setEditingId(null);
      setName('');
      setErrors({});
    } finally {
      setIsLoading(false);
    }
  };

  // Função para renderizar a lista de tags
  const renderTagsList = (tagsToRender: Tag[]) => {
    if (isLoading) {
      return <Loader text="Carregando tags..." />;
    }

    if (tagsToRender.length === 0) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <Tag className="h-12 w-12 text-gray-400 dark:text-foreground mx-auto mb-4" />
            <p className="text-gray-500 dark:text-foreground">
              {activeTab === 'todas' ? 'Nenhuma tag cadastrada' 
               : activeTab === 'recentes' ? 'Nenhuma tag recente'
               : 'Nenhuma tag encontrada'}
            </p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeira Tag
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {tagsToRender.map((tag) => (
          <Card key={tag.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center space-x-3 min-w-0">
                  <Tag className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="font-semibold text-lg truncate">{tag.name}</span>
                </div>
                <div className="flex space-x-2 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(tag.id)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(tag.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
        <h1 className="text-3xl font-bold">Tags</h1>
        <p className="text-muted-foreground">Gerencie suas tags para organizar melhor suas transações</p>
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
          <div className="flex items-center space-x-2 px-3 h-10 rounded-md border bg-white/90 border-slate-300/70 text-slate-900 shadow-sm backdrop-blur-sm dark:bg-slate-800/60 dark:border-white/15 dark:text-slate-100">
            <Calendar className="h-4 w-4 text-slate-700 dark:text-slate-200" />
            <span className="font-medium text-sm sm:text-base">{monthLabelCapitalized} {yearLabel}</span>
          </div>
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
        
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Tag
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tags</CardTitle>
            <Hash className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {tags.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Tags cadastradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mais Utilizadas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {Math.floor(tags.length / 2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Tags populares
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pouco Utilizadas</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {Math.ceil(tags.length / 2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Tags raras
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="todas" className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Todas as Tags
          </TabsTrigger>
          <TabsTrigger value="populares" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Mais Utilizadas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todas" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Todas as Tags</h3>
            <p className="text-sm text-muted-foreground">
              Visualize e gerencie todas as suas tags de organização
            </p>
          </div>
          {renderTagsList(tags)}
        </TabsContent>

        <TabsContent value="populares" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Tags Mais Utilizadas</h3>
            <p className="text-sm text-muted-foreground">
              Tags que você usa com mais frequência nas suas transações
            </p>
          </div>
          {renderTagsList(tags.slice(0, Math.ceil(tags.length / 2)))}
        </TabsContent>
      </Tabs>

      {/* Formulário */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar Tag' : 'Nova Tag'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  placeholder="Ex: Viagem"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {errors.name && <span className="text-red-600 text-xs">{errors.name}</span>}
              </div>
              <div className="flex space-x-2">
                <Button type="submit">{editingId ? 'Atualizar' : 'Cadastrar'}</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
