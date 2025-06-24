"use client"

import { useState } from "react"

type Transaction = {
  id: string
  description: string
  amount: number
  date: string
  category: {
    id: string
    name: string
  }
}

type Props = {
  transactions: Transaction[]
  loading: boolean
  onRefresh: () => void
  categories: { id: string; name: string }[]
}

export default function TransactionsTable({ transactions, loading, onRefresh, categories }: Readonly<Props>) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState({
    description: "",
    amount: "",
    categoryId: "",
    date: "",
  })
  const [error, setError] = useState("")

  function startEdit(tx: Transaction) {
    setEditingId(tx.id)
    setEditData({
      description: tx.description,
      amount: tx.amount.toString(),
      categoryId: tx.category.id,
      date: tx.date.slice(0, 10),
    })
    setError("")
  }

  function cancelEdit() {
    setEditingId(null)
    setError("")
  }

  async function saveEdit() {
    if (!editData.description.trim() || !editData.amount || !editData.categoryId || !editData.date) {
      setError("Preencha todos os campos.")
      return
    }

    try {
      const res = await fetch("/api/transactions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          description: editData.description,
          amount: Number(editData.amount),
          categoryId: editData.categoryId,
          date: editData.date,
        }),
      })

      if (!res.ok) throw new Error("Erro ao salvar")

      setEditingId(null)
      onRefresh()
    } catch {
      setError("Erro ao salvar a transação.")
    }
  }

  async function deleteTransaction(id: string) {
    if (!confirm("Confirma exclusão desta transação?")) return

    try {
      const res = await fetch("/api/transactions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!res.ok) throw new Error("Erro ao deletar")

      onRefresh()
    } catch {
      alert("Erro ao deletar a transação.")
    }
  }

  if (loading) return <p>Carregando transações...</p>

  return (
    <>
      {error && <p className="text-red-600 mb-2">{error}</p>}

      <table className="w-full border-collapse mb-6">
        <thead>
          <tr>
            <th className="border p-2 text-left">Descrição</th>
            <th className="border p-2 text-right">Valor</th>
            <th className="border p-2 text-left">Categoria</th>
            <th className="border p-2 text-left">Data</th>
            <th className="border p-2 text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) =>
            editingId === tx.id ? (
              <tr key={tx.id} className="bg-yellow-50">
                <td className="border p-2">
                  <input
                    type="text"
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    className="w-full border rounded p-1"
                  />
                </td>
                <td className="border p-2 text-right">
                  <input
                    type="number"
                    value={editData.amount}
                    onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                    className="w-full border rounded p-1 text-right"
                  />
                </td>
                <td className="border p-2">
                  <select
                    value={editData.categoryId}
                    onChange={(e) => setEditData({ ...editData, categoryId: e.target.value })}
                    className="w-full border rounded p-1"
                  >
                    <option value="">Selecione</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border p-2">
                  <input
                    type="date"
                    value={editData.date}
                    onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                    className="border rounded p-1"
                  />
                </td>
                <td className="border p-2 text-center flex gap-2 justify-center">
                  <button
                    onClick={saveEdit}
                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500 transition"
                  >
                    Cancelar
                  </button>
                </td>
              </tr>
            ) : (
              <tr key={tx.id} className="hover:bg-gray-100">
                <td className="border p-2">{tx.description}</td>
                <td
                  className={`border p-2 text-right ${
                    tx.amount < 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  R$ {tx.amount.toFixed(2)}
                </td>
                <td className="border p-2">{tx.category.name}</td>
                <td className="border p-2">{new Date(tx.date).toLocaleDateString("pt-BR")}</td>
                <td className="border p-2 text-center flex gap-2 justify-center">
                  <button
                    onClick={() => startEdit(tx)}
                    className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => deleteTransaction(tx.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            )
          )}
          {transactions.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center p-4">
                Nenhuma transação encontrada.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  )
}
