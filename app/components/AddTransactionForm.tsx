"use client"

import { useState } from "react"

type Category = {
  id: string
  name: string
}

type Props = {
  categories: Category[]
  onAddSuccess: () => void
}

export default function AddTransactionForm({ categories, onAddSuccess }: Readonly<Props>) {
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!description.trim() || !amount || !date || !categoryId) {
      setError("Preencha todos os campos.")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          amount: Number(amount),
          date,
          categoryId,
        }),
      })

      if (!res.ok) throw new Error("Erro ao adicionar transação")

      setDescription("")
      setAmount("")
      setDate("")
      setCategoryId("")
      onAddSuccess()
    } catch {
      setError("Erro ao adicionar a transação.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded max-w-xl mx-auto">
      {error && <p className="text-red-600 mb-2">{error}</p>}

      <div className="mb-2">
        <label className="block mb-1">Descrição</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border p-2 rounded"
          disabled={loading}
        />
      </div>

      <div className="mb-2">
        <label className="block mb-1">Valor</label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full border p-2 rounded"
          disabled={loading}
        />
      </div>

      <div className="mb-2">
        <label className="block mb-1">Data</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full border p-2 rounded"
          disabled={loading}
        />
      </div>

      <div className="mb-4">
        <label className="block mb-1">Categoria</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full border p-2 rounded"
          disabled={loading}
        >
          <option value="">Selecione</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
      >
        {loading ? "Salvando..." : "Adicionar"}
      </button>
    </form>
  )
}
