"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

const tipos = [
  { value: "carteira", label: "Carteira" },
  { value: "banco", label: "Banco" },
  { value: "cartao", label: "Cartão" },
];

export default function NovaCarteiraPage() {
  const [form, setForm] = useState({ name: "", type: "carteira" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/wallets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setMessage("Carteira cadastrada com sucesso!");
      setForm({ name: "", type: "carteira" });
      setTimeout(() => router.push("/wallets"), 1000);
    } else {
      const data = await res.json();
      setMessage(data.error || "Erro ao cadastrar carteira");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold mb-4">Nova Carteira</h1>
      <Card>
        <CardHeader>
          <CardTitle>Cadastrar Carteira</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block mb-1">Nome</label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                placeholder="Ex: Carteira, Nubank, PicPay, Cartão XP..."
              />
            </div>
            <div>
              <label className="block mb-1">Tipo</label>
              <select
                className="w-full border rounded p-2"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                required
              >
                {tipos.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Cadastrando..." : "Cadastrar"}
            </Button>
            {message && <div className="mt-2 text-sm text-center">{message}</div>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
