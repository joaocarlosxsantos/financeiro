'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatDate, parseApiDate } from '@/lib/utils'
import { TagSelector } from '@/components/ui/tag-selector'
import { Edit, Trash2, Plus } from 'lucide-react'

import { Loader } from '@/components/ui/loader'

interface DespesaFixa {
  id: string;
  description: string;
  amount: number;
  dayOfMonth: number;
  categoryName?: string;
  categoryId?: string | null;
  walletId?: string | null;
  walletName?: string;
  startDate: Date;
  endDate?: Date;
  tags: string[];
}

export function DespesasFixasTab() {
  const [despesas, setDespesas] = useState<DespesaFixa[]>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string; type: 'EXPENSE' | 'INCOME' | 'BOTH' }>>([])
  const [wallets, setWallets] = useState<Array<{ id: string; name: string }>>([])
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    description: '',
    amount: '',
    dayOfMonth: '',
    categoryId: '',
    walletId: '',
    startDate: '',
    endDate: '',
    tags: [] as string[],
  })

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      const [catsRes, walletsRes, listRes, tagsRes] = await Promise.all([
        fetch('/api/categories', { cache: 'no-store' }),
        fetch('/api/wallets', { cache: 'no-store' }),
        fetch('/api/expenses?type=FIXED', { cache: 'no-store' }),
        fetch('/api/tags', { cache: 'no-store' }),
      ])
      if (catsRes.ok) setCategories(await catsRes.json())
      if (walletsRes.ok) setWallets(await walletsRes.json())
      if (tagsRes.ok) setTags(await tagsRes.json())
      if (listRes.ok) {
        const data = await listRes.json()
        const mapped = data.map((e: any) => ({
          id: e.id,
          description: e.description,
          amount: Number(e.amount),
          dayOfMonth: e.dayOfMonth ?? 1,
          categoryName: e.category?.name,
          categoryId: e.categoryId,
          walletId: e.walletId,
          walletName: e.wallet?.name,
          startDate: e.startDate ? parseApiDate(e.startDate) : new Date(),
          endDate: e.endDate ? parseApiDate(e.endDate) : undefined,
          tags: e.tags || [],
        }))
        setDespesas(mapped)
      }
      setIsLoading(false)
    }
    load()
  }, [])

  const handleEdit = (id: string) => {
    const d = despesas.find(x => x.id === id)
    if (d) {
      setEditingId(id)
      setForm({
        description: d.description,
        amount: String(d.amount),
        dayOfMonth: String(d.dayOfMonth ?? ''),
        categoryId: d.categoryId || '',
        walletId: d.walletId || '',
        startDate: d.startDate ? new Date(d.startDate).toISOString().slice(0,10) : '',
        endDate: d.endDate ? new Date(d.endDate).toISOString().slice(0,10) : '',
        tags: d.tags && d.tags.length > 0 ? [d.tags[0]] : [],
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
      type: 'FIXED',
      isFixed: true,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      dayOfMonth: form.dayOfMonth ? Number(form.dayOfMonth) : undefined,
      categoryId: form.categoryId || undefined,
      walletId: form.walletId || undefined,
      tags: form.tags,
    }
    let res;
    if (editingId) {
      res = await fetch(`/api/expenses/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }
    if (res.ok) {
      const saved = await res.json()
      const item = {
        id: saved.id,
        description: saved.description,
        amount: Number(saved.amount),
        dayOfMonth: saved.dayOfMonth ?? 1,
        categoryName: categories.find(c => c.id === saved.categoryId)?.name,
        categoryId: saved.categoryId,
        walletId: saved.walletId,
        walletName: wallets.find(w => w.id === saved.walletId)?.name,
        startDate: saved.startDate ? new Date(saved.startDate) : new Date(),
        endDate: saved.endDate ? new Date(saved.endDate) : undefined,
        tags: saved.tags || [],
      }
      if (editingId) setDespesas(prev => prev.map(x => x.id === saved.id ? item : x))
      else setDespesas(prev => [item, ...prev])
      setShowForm(false)
      setEditingId(null)
  setForm({ description: '', amount: '', dayOfMonth: '', categoryId: '', walletId: '', startDate: '', endDate: '', tags: [] })
    }
  }

  return (
    <div className="space-y-6">
      {/* Formulário */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? 'Editar Despesa Fixa' : 'Nova Despesa Fixa'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Input id="description" placeholder="Ex: Aluguel" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="amount">Valor</Label>
                  <Input id="amount" type="number" step="0.01" placeholder="0,00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="dayOfMonth">Dia do mês</Label>
                  <Input id="dayOfMonth" type="number" min="1" max="31" placeholder="5" value={form.dayOfMonth} onChange={e => setForm(f => ({ ...f, dayOfMonth: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="wallet">Carteira</Label>
                  <select
                    id="wallet"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.walletId}
                    onChange={e => setForm(f => ({ ...f, walletId: e.target.value }))}
                  >
                    <option value="">Selecione</option>
                    {wallets.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <select
                    id="category"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.categoryId}
                    onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                  >
                    <option value="">Sem categoria</option>
                    {categories.filter(c => c.type === 'EXPENSE' || c.type === 'BOTH').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="tag">Tag</Label>
                  <TagSelector tags={tags} value={form.tags[0] || ''} onChange={tagId => setForm(f => ({ ...f, tags: tagId ? [tagId] : [] }))} />
                </div>
                <div>
                  <Label htmlFor="startDate">Data de início</Label>
                  <Input id="startDate" type="date" lang="pt-BR" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="endDate">Data de fim (opcional)</Label>
                  <Input id="endDate" type="date" lang="pt-BR" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
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
        <Button onClick={() => {
          setForm({ description: '', amount: '', dayOfMonth: '', categoryId: '', walletId: '', startDate: '', endDate: '', tags: [] });
          setEditingId(null);
          setShowForm(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Despesa Fixa
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
                      Dia {despesa.dayOfMonth} de cada mês • {despesa.categoryName}
                    </p>
                    <p className="text-xs text-gray-500 break-words">
                      Início: {formatDate(despesa.startDate)}
                      {despesa.endDate && ` • Fim: ${formatDate(despesa.endDate)}`}
                      {despesa.walletName && ` • Carteira: ${despesa.walletName}`}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">
                      {formatCurrency(despesa.amount)}
                    </p>
                    <p className="text-sm text-gray-500">por mês</p>
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
            <p className="text-gray-500">Nenhuma despesa fixa cadastrada</p>
            <Button 
              className="mt-4"
              onClick={() => {
                setForm({ description: '', amount: '', dayOfMonth: '', categoryId: '', walletId: '', startDate: '', endDate: '', tags: [] });
                setEditingId(null);
                setShowForm(true);
              }}
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
