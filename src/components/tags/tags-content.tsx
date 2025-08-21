import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from '@/components/ui/loader';
import { Plus, Tag, Edit, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Tag {
  id: string;
  name: string;
}

export function TagsContent() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
    const [errors, setErrors] = useState<{ name?: string }>({});

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

  const handleEdit = (id: string) => {
    const tag = tags.find(t => t.id === id);
    if (tag) {
      setEditingId(id);
      setName(tag.name);
      setShowForm(true);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
    if (res.ok) setTags(tags.filter(t => t.id !== id));
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
        await fetch('/api/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Tags</h1>
          <p className="text-gray-600 dark:text-foreground">Gerencie suas tags para organizar melhor suas despesas e rendas</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Tag
        </Button>
      </div>

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
                <Input id="name" placeholder="Ex: Viagem" value={name} onChange={e => setName(e.target.value)} />
                {errors.name && <span className="text-red-600 text-xs">{errors.name}</span>}
              </div>
              <div className="flex space-x-2">
                <Button type="submit">
                  {editingId ? 'Atualizar' : 'Cadastrar'}
                </Button>
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

      {/* Lista de tags */}
      {isLoading ? (
        <Loader text="Carregando tags..." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {tags.map(tag => (
            <Card key={tag.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center space-x-3 min-w-0">
                    <Tag className="w-4 h-4 text-gray-400 dark:text-foreground flex-shrink-0" />
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
      )}

      {tags.length === 0 && !showForm && !isLoading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Tag className="h-12 w-12 text-gray-400 dark:text-foreground mx-auto mb-4" />
            <p className="text-gray-500 dark:text-foreground">Nenhuma tag cadastrada</p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeira Tag
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
