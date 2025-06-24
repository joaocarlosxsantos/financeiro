"use client"
import { signIn } from "next-auth/react"
import { useState } from "react"

export default function SignInPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    })

    setLoading(false)

    if (res?.error) {
      setError("Credenciais inválidas")
    } else {
      window.location.href = "/"
    }
  }

  async function handleRegister() {
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Erro ao cadastrar usuário")
        setLoading(false)
        return
      }

      // Opcional: fazer login automático após cadastrar
      const loginRes = await signIn("credentials", {
        redirect: false,
        email,
        password,
      })

      setLoading(false)

      if (loginRes?.error) {
        setError("Usuário cadastrado, mas erro ao logar automaticamente")
      } else {
        window.location.href = "/"
      }
    } catch {
      setError("Erro ao cadastrar usuário")
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4">
      <h1 className="text-2xl mb-4">Login</h1>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="mb-2 p-2 border w-full rounded"
      />
      <input
        type="password"
        placeholder="Senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        className="mb-4 p-2 border w-full rounded"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded mr-2"
      >
        Entrar
      </button>

      <button
        type="button"
        onClick={handleRegister}
        disabled={loading}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Cadastrar
      </button>

      {error && <p className="text-red-600 mt-2">{error}</p>}
    </form>
  )
}
