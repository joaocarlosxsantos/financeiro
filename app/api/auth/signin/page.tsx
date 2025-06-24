"use client"
import { signIn } from "next-auth/react"
import { useState } from "react"

export default function SignInPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    })

    if (res?.error) {
      setError("Credenciais inválidas")
    } else {
      window.location.href = "/"
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
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
        Entrar
      </button>
      {error && <p className="text-red-600 mt-2">{error}</p>}
    </form>
  )
}
