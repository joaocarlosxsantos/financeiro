"use client"

import { useState } from "react"

type Category = {
  id: string
  name: string
}

type Props = {
  categories: Category[]
  loadingCategories: boolean
  onRefresh: () => void
}

export default function CategoriesManager({ categories, loadingCategories, onRefresh }: Readonly<Props>) {
  const [newName, setNewName] = useState("")
  const [error, setError] = useState("")

  async function addCategory() {
    if (!newName.trim()) {
      setError("Digite um nome válido")
      return
    }
    setError("")
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      })
      if (!res.ok) throw new Error("Erro ao adicionar categoria")
      setNewName("")
      onRefresh()
    } catch {
      setError("Erro ao adicionar categoria")
    }
  }

  return (
    <section className="mb-6">
      <h2 className="text-xl font-semibold mb-2">Categorias</h2>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Nova categoria"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="border p-2 rounded flex-grow"
        />
        <button
          onClick={addCategory}
          disabled={loadingCategories}
          className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Adicionar
        </button>
      </div>

      {error && <p className="text-red-600 mb-2">{error}</p>}

      <ul>
        {loadingCategories ? (
          <li>Carregando categorias...</li>
        ) : (
          categories.map((cat) => <li key={cat.id}>{cat.name}</li>)
        )}
      </ul>
    </section>
  )
}
