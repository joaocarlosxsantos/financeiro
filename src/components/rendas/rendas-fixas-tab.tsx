'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatDate, parseApiDate } from '@/lib/utils'
import { Edit, Trash2, Plus } from 'lucide-react'
import { Loader } from '@/components/ui/loader'

interface RendaFixa {
  id: string
  description: string
  amount: number
  dayOfMonth: number
  categoryName?: string
  categoryId?: string | null
  startDate: Date
  endDate?: Date
}

export function RendasFixasTab() {
  const [rendas, setRendas] = useState<RendaFixa[]>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState({ description: '', amount: '', dayOfMonth: '', categoryId: '', startDate: '', endDate: '' })

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      const [catsRes, listRes] = await Promise.all([
        fetch('/api/categories', { cache: 'no-store' }),
        fetch('/api/incomes?type=FIXED', { cache: 'no-store' }),
      ])
      if (catsRes.ok) setCategories(await catsRes.json())
      if (listRes.ok) {
        const data = await listRes.json()
        const mapped = data.map((e: any) => ({
          id: e.id,
          description: e.description,
          amount: Number(e.amount),
          dayOfMonth: e.dayOfMonth ?? 1,
          categoryName: e.category?.name,
          categoryId: e.categoryId,
          startDate: e.startDate ? parseApiDate(e.startDate) : new Date(),
          endDate: e.endDate ? parseApiDate(e.endDate) : undefined,
        }))
        setRendas(mapped)
      }
      setIsLoading(false)
    }
    load()
  }, [])

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleEdit = (id: string) => {
    const r = rendas.find(x => x.id === id)
    if (r) {
      setEditingId(id)
      setForm({
        description: r.description,
        amount: String(r.amount),
        dayOfMonth: String(r.dayOfMonth ?? ''),
        categoryId: r.categoryId || '',
        startDate: r.startDate ? new Date(r.startDate).toISOString().slice(0,10) : '',
        endDate: r.endDate ? new Date(r.endDate).toISOString().slice(0,10) : '',
      })
      setShowForm(true)
    }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/incomes/${id}`, { method: 'DELETE' })
    if (res.ok) setRendas(rendas.filter(r => r.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      description: form.description,
      amount: Number(form.amount),
      type: 'FIXED',
      isFixed: true,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      dayOfMonth: form.dayOfMonth ? Number(form.dayOfMonth) : undefined,
      categoryId: form.categoryId || undefined,
    }
    const res = await fetch(editingId ? `/api/incomes/${editingId}` : '/api/incomes', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const saved = await res.json()
      setRendas(prev => {
        const item = {
          id: saved.id,
          description: saved.description,
          amount: Number(saved.amount),
          dayOfMonth: saved.dayOfMonth ?? 1,
          categoryName: categories.find(c => c.id === saved.categoryId)?.name,
          categoryId: saved.categoryId,
          startDate: saved.startDate ? new Date(saved.startDate) : new Date(),
          endDate: saved.endDate ? new Date(saved.endDate) : undefined,
        }
        if (editingId) return prev.map(x => x.id === saved.id ? item : x)
        return [item, ...prev]
      })
      setForm({ description: '', amount: '', dayOfMonth: '', categoryId: '', startDate: '', endDate: '' })
      setEditingId(null)
      setShowForm(false)
    }
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
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Input id="description" placeholder="Ex: Salário" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="amount">Valor</Label>
                  <Input id="amount" type="number" step="0.01" placeholder="0,00" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="dayOfMonth">Dia do Mês</Label>
                  <Input id="dayOfMonth" type="number" min="1" max="31" placeholder="25" value={form.dayOfMonth} onChange={(e) => setForm(f => ({ ...f, dayOfMonth: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <select 
                    id="category"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.categoryId}
                    onChange={(e) => setForm(f => ({ ...f, categoryId: e.target.value }))}
                  >
                    <option value="">Sem categoria</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="startDate">Data de Início</Label>
                  <Input id="startDate" type="date" lang="pt-BR" value={form.startDate} onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="endDate">Data de Fim (Opcional)</Label>
                  <Input id="endDate" type="date" lang="pt-BR" value={form.endDate} onChange={(e) => setForm(f => ({ ...f, endDate: e.target.value }))} />
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
      {isLoading ? (
        <Loader text="Carregando rendas..." />
      ) : (
      <div className="space-y-4">
        {rendas.map((renda) => (
          <Card key={renda.id}>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div>
                    <h3 className="font-semibold text-lg truncate">{renda.description}</h3>
                    <p className="text-sm text-gray-600 break-words">
                      Dia {renda.dayOfMonth} de cada mês • {renda.categoryName}
                    </p>
                    <p className="text-xs text-gray-500 break-words">
                      Início: {formatDate(renda.startDate)}
                      {renda.endDate && ` • Fim: ${formatDate(renda.endDate)}`}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
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
      )}

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
