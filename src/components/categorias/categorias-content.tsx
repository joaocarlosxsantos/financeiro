'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Trash2, Plus, Tag } from 'lucide-react';
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

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [color, setColor] = useState('var(--c-3b82f6)');

  // (Removido useEffect de sincronização de cor, pois resetForm já garante o valor correto)
  const [type, setType] = useState<'EXPENSE' | 'INCOME' | 'BOTH'>('EXPENSE');
  const [icon, setIcon] = useState('');

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
    setName(cat ? cat.name : '');
  setColor(cat ? cat.color : 'var(--c-3b82f6)');
    setType(cat ? cat.type : 'EXPENSE');
    setIcon(cat && cat.icon ? cat.icon : '');
    setTimeout(() => setShowForm(true), 0);
  };

  const handleEdit = (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (cat) {
      resetForm(cat);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (res.ok) setCategories(categories.filter((c) => c.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string } = {};
    if (!name.trim()) newErrors.name = 'Nome é obrigatório.';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    if (editingId) {
      const res = await fetch(`/api/categories/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color, type, icon: icon || undefined }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      }
    } else {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color, type, icon: icon || undefined }),
      });
      if (res.ok) {
        const created = await res.json();
        setCategories((prev) => [created, ...prev]);
        if (onCreated) onCreated(created.id);
      }
    }
    setShowForm(false);
    setEditingId(null);
    setName('');
  setColor('var(--c-3b82f6)');
    setType('EXPENSE');
    setIcon('');
    setErrors({});
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Categorias
          </h1>
          <p className="text-gray-600 dark:text-foreground">
            Gerencie suas categorias de despesas e rendas
          </p>
        </div>

        <Button onClick={() => resetForm(undefined)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      {/* Formulário */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar Categoria' : 'Nova Categoria'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Alimentação"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  {errors.name && <span className="text-red-600 text-xs">{errors.name}</span>}
                </div>
                <div>
                  <Label htmlFor="color">Cor</Label>
                  <Input
                    id="color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="type">Tipo</Label>
                  <select
                    id="type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={type}
                    onChange={(e) => setType(e.target.value as 'EXPENSE' | 'INCOME' | 'BOTH')}
                  >
                    <option value="EXPENSE">Despesa</option>
                    <option value="INCOME">Renda</option>
                    <option value="BOTH">Ambos</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="icon">Ícone (Opcional)</Label>
                  <Input
                    id="icon"
                    placeholder="Ex: 🍕"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                  />
                </div>
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

      {/* Lista de categorias */}
      {isLoading ? (
        <Loader text="Carregando categorias..." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-lg truncate">{category.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-foreground">
                        {getTypeLabel(category.type)}
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-2 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(category.id)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(category.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {categories.length === 0 && !showForm && (
        <Card>
          <CardContent className="p-12 text-center">
            <Tag className="h-12 w-12 text-gray-400 dark:text-foreground mx-auto mb-4" />
            <p className="text-gray-500 dark:text-foreground">Nenhuma categoria cadastrada</p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeira Categoria
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
