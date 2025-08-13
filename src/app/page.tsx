import { redirect } from 'next/navigation'

export default function Home() {
  // Por enquanto, redireciona para o dashboard
  // Depois será implementada a lógica de autenticação
  redirect('/dashboard')
}
