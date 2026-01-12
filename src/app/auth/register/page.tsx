'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setMessage('Usuário cadastrado com sucesso! Redirecionando...');
      setTimeout(() => router.push('/auth/signin'), 1200);
    } else {
      const data = await res.json();
      setMessage(data.error || 'Erro ao cadastrar usuário');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-blue-300 dark:from-background dark:via-background dark:to-blue-950">
      <Card className="w-full max-w-md shadow-2xl rounded-2xl border border-blue-100 dark:border-blue-900">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
            {/* Ícone pode ser alterado para outro se quiser */}
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7" /></svg>
          </div>
          <CardTitle className="text-3xl font-bold text-blue-700 dark:text-blue-300">Criar Conta</CardTitle>
          <p className="text-gray-600 dark:text-gray-400">Preencha os dados para se cadastrar</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="name" className="text-base">Nome</Label>
              <Input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                placeholder="Seu nome"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-base">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
                placeholder="seu@email.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-base">Senha</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  placeholder="Crie uma senha"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold py-2 rounded-lg transition-all duration-200" size="lg" disabled={loading}>
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </Button>
            {message && <div className="mt-2 text-sm text-center animate-pulse text-blue-700 dark:text-blue-300">{message}</div>}
          </form>
          <div className="mt-6 text-center">
            <span className="text-gray-500 dark:text-gray-400">Já tem conta?</span>
            <Button
              type="button"
              variant="outline"
              className="w-full mt-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg"
              onClick={() => router.push('/auth/signin')}
            >
              Fazer login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
