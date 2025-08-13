'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Edit, Trash2, Plus } from 'lucide-react'

interface RendaVariavel {
  id: string
  description: string
  amount: number
  date: Date
  category: string
}

export function RendasVariaveisTab() {
  const [rendas, setRendas] = useState<RendaVariavel[]>([
    {
      id: '1',
      description: 'Freelance',
      amount: 500.00,
      date: new Date('2024-01-20'),
      category: 'Trabalho',
    },
    {
      id: '2',
      description: 'Venda de Produtos',
      amount: 150.00,
      date: new Date('2024-01-22'),
      category: 'Vendas',
    },
  ])

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleEdit = (id: string) => {
    setEditingId(id)
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    setRendas(rendas.filter(r => r.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Formulário */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? 'Editar Renda Variável' : 'Nova Renda Variável'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Input id="description" placeholder="Ex: Freelance" />
                </div>
                <div>
                  <Label htmlFor="amount">Valor</Label>
                  <Input id="amount" type="number" step="0.01" placeholder="0,00" />
                </div>
                <div>
                  <Label htmlFor="date">Data</Label>
                  <Input id="date" type="date" />
                </div>
                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Input id="category" placeholder="Ex: Trabalho" />
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

      {/* Botão para adicionar */}
      {!showForm && (
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Renda Variável
        </Button>
      )}

      {/* Lista de rendas */}
      <div className="space-y-4">
        {rendas.map((renda) => (
          <Card key={renda.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h3 className="font-semibold text-lg">{renda.description}</h3>
                      <p className="text-sm text-gray-600">
                        {formatDate(renda.date)} • {renda.category}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(renda.amount)}
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(renda.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(renda.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {rendas.length === 0 && !showForm && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">Nenhuma renda variável cadastrada</p>
            <Button 
              className="mt-4"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeira Renda
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
