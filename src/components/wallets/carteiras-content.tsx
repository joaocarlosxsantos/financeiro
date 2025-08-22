'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Edit, Trash2, Plus, Wallet as WalletIcon } from 'lucide-react'
import { Loader } from '@/components/ui/loader'


interface Wallet {
  id: string
  name: string
  type: string
  expenses: { amount: number | string }[]
  incomes: { amount: number | string }[]
}

interface CarteirasContentProps {
  onCreated?: (id: string) => void;
}


export function CarteirasContent({ onCreated }: CarteirasContentProps) {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState('Banco')
  const [errors, setErrors] = useState<{ name?: string; type?: string }>({})

  // Função para carregar carteiras (pode ser chamada manualmente)
  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/wallets', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setWallets(data);
      } else {
        setError('Erro ao carregar carteiras');
      }
    } catch {
      setError('Erro ao carregar carteiras');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleEdit = (id: string) => {
    const wallet = wallets.find(w => w.id === id)
    if (wallet) {
      setEditingId(id)
      setName(wallet.name)
  setType(wallet.type)
      setShowForm(true)
    }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/wallets/${id}`, { method: 'DELETE' })
    if (res.ok) setWallets(wallets.filter(w => w.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string; type?: string } = {};
    if (!name.trim()) newErrors.name = 'Nome é obrigatório.';
    if (!type.trim()) newErrors.type = 'Tipo é obrigatório.';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    if (editingId) {
      const res = await fetch(`/api/wallets/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type })
      });
      if (res.ok) {
        const updated = await res.json();
        setWallets(prev => prev.map(w => (w.id === updated.id ? updated : w)));
      }

    } else {
      const res = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type })
      });
      if (res.ok) {
        const created = await res.json();
        setWallets(prev => [created, ...prev]);
        if (onCreated) onCreated(created.id);
      }
    }

    setShowForm(false);
    setEditingId(null);
    setName('');
    setType('Banco');
    setErrors({});
  };

  return (
  <div className="space-y-4 px-2 sm:px-0">
      {/* Header */}
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">Carteiras</h1>
          <p className="text-gray-600 dark:text-foreground">Gerencie suas carteiras e saldos</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Carteira
        </Button>
      </div>

      {/* Formulário */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar Carteira' : 'Nova Carteira'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" placeholder="Ex: Carteira Principal" value={name} onChange={e => setName(e.target.value)} />
                  {errors.name && <span className="text-red-600 text-xs">{errors.name}</span>}
                </div>
                <div>
                  <Label htmlFor="type">Tipo</Label>
                  <select
                    id="type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-2 sm:px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={type}
                    onChange={e => setType(e.target.value)}
                  >
                    <option value="Banco">Banco</option>
                    <option value="Vale Benefícios">Vale Benefícios</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Outros">Outros</option>
                  </select>
                  {errors.type && <span className="text-red-600 text-xs">{errors.type}</span>}
                </div>
              </div>
              <div className="flex space-x-1 sm:space-x-2">
                <Button type="submit">{editingId ? 'Atualizar' : 'Cadastrar'}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null) }}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}


      {/* Lista de carteiras com tratamento de erro e recarregar */}
      {isLoading && <Loader text="Carregando carteiras..." />}
      {error && (
        <div className="text-red-500 text-center">
          {error}
          <Button className="ml-2" size="sm" onClick={load}>Tentar novamente</Button>
        </div>
      )}
      {!isLoading && !error && (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-2 sm:gap-6 overflow-x-auto">
          {wallets.map(wallet => {
            const saldo =
              (wallet.incomes?.reduce((acc, i) => acc + Number(i.amount), 0) || 0) -
              (wallet.expenses?.reduce((acc, e) => acc + Number(e.amount), 0) || 0)

            return (
              <Card key={wallet.id} className="p-6 shadow-lg rounded-xl">
                <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                    <WalletIcon className="h-8 w-8 text-gray-500 dark:text-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-xl truncate">{wallet.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-foreground">{wallet.type}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={saldo >= 0 ? 'text-green-600 font-bold text-lg' : 'text-red-600 font-bold text-lg'}>
                      {saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(wallet.id)}>
                        <Edit className="h-5 w-5" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(wallet.id)}>
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {wallets.length === 0 && !showForm && (
        <Card>
          <CardContent className="p-12 text-center">
            <WalletIcon className="h-12 w-12 text-gray-400 dark:text-foreground mx-auto mb-4" />
            <p className="text-gray-500 dark:text-foreground">Nenhuma carteira cadastrada</p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeira Carteira
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
