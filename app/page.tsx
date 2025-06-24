"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import TransactionsTable from "./components/TransactionsTable"
import CategoriesManager from "./components/CategoriesManager"
import AddTransactionForm from "./components/AddTransactionForm"

type Category = {
  id: string
  name: string
}

type Transaction = {
  id: string
  description: string
  amount: number
  date: string
  category: Category
}

export default function Home() {
  const { data: session, status } = useSession()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [loadingCategories, setLoadingCategories] = useState(false)

  async function fetchTransactions() {
    setLoadingTransactions(true)
    try {
      const res = await fetch("/api/transactions")
      if (res.status === 401) {
        alert("Você precisa fazer login para acessar as transações.")
        return
      }
      if (!res.ok) throw new Error("Erro ao carregar transações")
      const data = await res.json()
      setTransactions(data)
    } catch {
      alert("Erro ao carregar transações.")
    } finally {
      setLoadingTransactions(false)
    }
  }

  async function fetchCategories() {
    setLoadingCategories(true)
    try {
      const res = await fetch("/api/categories")
      if (!res.ok) throw new Error("Erro ao carregar categorias")
      const data = await res.json()
      setCategories(data)
    } catch {
      alert("Erro ao carregar categorias.")
    } finally {
      setLoadingCategories(false)
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      fetchTransactions()
      fetchCategories()
    }
  }, [status])

  if (status === "loading") return <p>Carregando...</p>

  if (!session)
    return (
      <p>
        Você precisa fazer login para acessar o app.
        {/* Você pode colocar um link para /signin aqui */}
      </p>
    )

  return (
    <main className="max-w-4xl mx-auto p-4">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Controle Financeiro</h1>
        <div className="flex items-center gap-4">
          <span>Olá, {session.user?.email}</span>
          <button
            onClick={() => signOut()}
            className="bg-gray-200 rounded px-3 py-1 hover:bg-gray-300"
          >
            Sair
          </button>
        </div>
      </div>

      <AddTransactionForm
        categories={categories}
        onAddSuccess={fetchTransactions}
      />

      <CategoriesManager
        categories={categories}
        loadingCategories={loadingCategories}
        onRefresh={fetchCategories}
      />

      <TransactionsTable
        transactions={transactions}
        loading={loadingTransactions}
        onRefresh={fetchTransactions}
        categories={categories}
      />
    </main>
  )
}
