'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Edit, Trash2, Plus } from 'lucide-react'

interface DespesaVariavel {
  id: string
  description: string
  amount: number
  date: Date
  category: string
}

export function DespesasVariaveisTab() {
  const [despesas, setDespesas] = useState<DespesaVariavel[]>([
    {
      id: '1',
      description: 'Supermercado',
      amount: 350.50,
      date: new Date('2024-01-15'),
      category: 'Alimentação',
    },
    {
      id: '2',
      description: 'Combustível',
      amount: 120.00,
      date: new Date('2024-01-18'),
      category: 'Transporte',
    },
  ])

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleEdit = (id: string) => {
    setEditingId(id)
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    setDespesas(despesas.filter(d => d.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Formulário */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? 'Editar Despesa Variável' : 'Nova Despesa Variável'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Input id="description" placeholder="Ex: Supermercado" />
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
                  <Input id="category" placeholder="Ex: Alimentação" />
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
          Adicionar Despesa Variável
        </Button>
      )}

      {/* Lista de despesas */}
      <div className="space-y-4">
        {despesas.map((despesa) => (
          <Card key={despesa.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h3 className="font-semibold text-lg">{despesa.description}</h3>
                      <p className="text-sm text-gray-600">
                        {formatDate(despesa.date)} • {despesa.category}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">
                      {formatCurrency(despesa.amount)}
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(despesa.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(despesa.id)}
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

      {despesas.length === 0 && !showForm && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">Nenhuma despesa variável cadastrada</p>
            <Button 
              className="mt-4"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeira Despesa
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
