'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Edit, Trash2, Plus, Tag } from 'lucide-react'

interface Category {
  id: string
  name: string
  color: string
  type: 'EXPENSE' | 'INCOME' | 'BOTH'
  icon?: string
}

export function CategoriasContent() {
  const [categories, setCategories] = useState<Category[]>([
    {
      id: '1',
      name: 'Alimentação',
      color: '#ef4444',
      type: 'EXPENSE',
    },
    {
      id: '2',
      name: 'Transporte',
      color: '#3b82f6',
      type: 'EXPENSE',
    },
    {
      id: '3',
      name: 'Moradia',
      color: '#10b981',
      type: 'EXPENSE',
    },
    {
      id: '4',
      name: 'Trabalho',
      color: '#f59e0b',
      type: 'INCOME',
    },
    {
      id: '5',
      name: 'Investimentos',
      color: '#8b5cf6',
      type: 'BOTH',
    },
  ])

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleEdit = (id: string) => {
    setEditingId(id)
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    setCategories(categories.filter(c => c.id !== id))
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'EXPENSE':
        return 'Despesa'
      case 'INCOME':
        return 'Renda'
      case 'BOTH':
        return 'Ambos'
      default:
        return type
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Categorias</h1>
          <p className="text-gray-600">Gerencie suas categorias de despesas e rendas</p>
        </div>
        
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      {/* Formulário */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? 'Editar Categoria' : 'Nova Categoria'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" placeholder="Ex: Alimentação" />
                </div>
                <div>
                  <Label htmlFor="color">Cor</Label>
                  <Input id="color" type="color" defaultValue="#3b82f6" />
                </div>
                <div>
                  <Label htmlFor="type">Tipo</Label>
                  <select 
                    id="type" 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="EXPENSE">Despesa</option>
                    <option value="INCOME">Renda</option>
                    <option value="BOTH">Ambos</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="icon">Ícone (Opcional)</Label>
                  <Input id="icon" placeholder="Ex: 🍕" />
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button type="submit">
                  {editingId ? 'Atualizar' : 'Cadastrar'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setEditingId(null)
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
                    <p className="text-sm text-gray-600">
                      {getTypeLabel(category.type)}
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(category.id)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(category.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {categories.length === 0 && !showForm && (
        <Card>
          <CardContent className="p-12 text-center">
            <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma categoria cadastrada</p>
            <Button 
              className="mt-4"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeira Categoria
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
