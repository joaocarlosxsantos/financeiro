'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatDate, parseApiDate } from '@/lib/utils'
import { Edit, Trash2, Plus } from 'lucide-react'
import { Loader } from '@/components/ui/loader'

interface DespesaVariavel {
  id: string
  description: string
  amount: number
  date: Date
  categoryName?: string
  categoryId?: string | null
}

export function DespesasVariaveisTab() {
  const [despesas, setDespesas] = useState<DespesaVariavel[]>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [form, setForm] = useState({ description: '', amount: '', date: '', categoryId: '' })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      const today = new Date()
      const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0,10)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0,10)
      const [catsRes, listRes] = await Promise.all([
        fetch('/api/categories', { cache: 'no-store' }),
        fetch(`/api/expenses?type=VARIABLE&start=${start}&end=${end}`, { cache: 'no-store' }),
      ])
      if (catsRes.ok) setCategories(await catsRes.json())
      if (listRes.ok) {
        const data = await listRes.json()
        const mapped = data.map((e: any) => ({
          id: e.id,
          description: e.description,
          amount: Number(e.amount),
          date: parseApiDate(e.date),
          categoryName: e.category?.name,
          categoryId: e.categoryId,
        }))
        setDespesas(mapped)
      }
      setIsLoading(false)
    }
    load()
  }, [])

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleEdit = (id: string) => {
    const d = despesas.find(x => x.id === id)
    if (d) {
      const dd = d.date
      const ddmmyyyy = dd.toLocaleDateString('pt-BR').split('/').reverse().join('-')
      setEditingId(id)
      setForm({
        description: d.description,
        amount: String(d.amount),
        date: ddmmyyyy,
        categoryId: d.categoryId || '',
      })
      setShowForm(true)
    }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    if (res.ok) setDespesas(despesas.filter(d => d.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      description: form.description,
      amount: Number(form.amount),
      date: form.date, // yyyy-MM-dd
      type: 'VARIABLE',
      isFixed: false,
      categoryId: form.categoryId || undefined,
    }
    const res = await fetch(editingId ? `/api/expenses/${editingId}` : '/api/expenses', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const saved = await res.json()
      setDespesas(prev => {
        const item = {
          id: saved.id,
          description: saved.description,
          amount: Number(saved.amount),
          date: new Date(saved.date),
          categoryName: categories.find(c => c.id === saved.categoryId)?.name,
          categoryId: saved.categoryId,
        }
        if (editingId) return prev.map(x => x.id === saved.id ? item : x)
        return [item, ...prev]
      })
      setForm({ description: '', amount: '', date: '', categoryId: '' })
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
              {editingId ? 'Editar Despesa Variável' : 'Nova Despesa Variável'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Input id="description" placeholder="Ex: Supermercado" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="amount">Valor</Label>
                  <Input id="amount" type="number" step="0.01" placeholder="0,00" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="date">Data</Label>
                  <Input id="date" type="date" lang="pt-BR" value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
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
      {isLoading ? (
        <Loader text="Carregando despesas..." />
      ) : (
      <div className="space-y-4">
        {despesas.map((despesa) => (
          <Card key={despesa.id}>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div>
                    <h3 className="font-semibold text-lg truncate">{despesa.description}</h3>
                  <p className="text-sm text-gray-600 break-words">
                      {formatDate(despesa.date)} • {despesa.categoryName}
                  </p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
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
      )}

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
