'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Edit, Trash2, Plus } from 'lucide-react'

interface RendaFixa {
  id: string
  description: string
  amount: number
  dayOfMonth: number
  category: string
  startDate: Date
  endDate?: Date
}

export function RendasFixasTab() {
  const [rendas, setRendas] = useState<RendaFixa[]>([
    {
      id: '1',
      description: 'Salário',
      amount: 4500,
      dayOfMonth: 25,
      category: 'Trabalho',
      startDate: new Date('2024-01-01'),
    },
    {
      id: '2',
      description: 'Aluguel Recebido',
      amount: 800,
      dayOfMonth: 5,
      category: 'Investimentos',
      startDate: new Date('2024-01-01'),
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
              {editingId ? 'Editar Renda Fixa' : 'Nova Renda Fixa'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Input id="description" placeholder="Ex: Salário" />
                </div>
                <div>
                  <Label htmlFor="amount">Valor</Label>
                  <Input id="amount" type="number" step="0.01" placeholder="0,00" />
                </div>
                <div>
                  <Label htmlFor="dayOfMonth">Dia do Mês</Label>
                  <Input id="dayOfMonth" type="number" min="1" max="31" placeholder="25" />
                </div>
                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Input id="category" placeholder="Ex: Trabalho" />
                </div>
                <div>
                  <Label htmlFor="startDate">Data de Início</Label>
                  <Input id="startDate" type="date" />
                </div>
                <div>
                  <Label htmlFor="endDate">Data de Fim (Opcional)</Label>
                  <Input id="endDate" type="date" />
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
          Adicionar Renda Fixa
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
                        Dia {renda.dayOfMonth} de cada mês • {renda.category}
                      </p>
                      <p className="text-xs text-gray-500">
                        Início: {formatDate(renda.startDate)}
                        {renda.endDate && ` • Fim: ${formatDate(renda.endDate)}`}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(renda.amount)}
                    </p>
                    <p className="text-sm text-gray-500">por mês</p>
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
            <p className="text-gray-500">Nenhuma renda fixa cadastrada</p>
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
