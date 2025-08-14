import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default async function TransferPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return <div className="p-8">Você precisa estar logado para transferir entre carteiras.</div>;
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return <div className="p-8">Usuário não encontrado.</div>;
  }
  const wallets = await prisma.wallet.findMany({ where: { userId: user.id } });
  return (
    <div className="max-w-xl mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold mb-4">Transferir entre Carteiras</h1>
      <TransferForm wallets={wallets} />
    </div>
  );
}

function TransferForm({ wallets }: { wallets: any[] }) {
  const [fromWalletId, setFromWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const res = await fetch('/api/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromWalletId, toWalletId, amount: Number(amount) }),
    });
    if (res.ok) {
      setMessage('Transferência realizada com sucesso!');
      setFromWalletId('');
      setToWalletId('');
      setAmount('');
    } else {
      const data = await res.json();
      setMessage(data.error || 'Erro ao transferir');
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nova Transferência</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block mb-1">De</label>
            <select className="w-full border rounded p-2" value={fromWalletId} onChange={e => setFromWalletId(e.target.value)} required>
              <option value="">Selecione a carteira de origem</option>
              {wallets.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1">Para</label>
            <select className="w-full border rounded p-2" value={toWalletId} onChange={e => setToWalletId(e.target.value)} required>
              <option value="">Selecione a carteira de destino</option>
              {wallets.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1">Valor</label>
            <Input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <Button type="submit" disabled={loading}>{loading ? 'Transferindo...' : 'Transferir'}</Button>
          {message && <div className="mt-2 text-sm text-center">{message}</div>}
        </form>
      </CardContent>
    </Card>
  );
}
