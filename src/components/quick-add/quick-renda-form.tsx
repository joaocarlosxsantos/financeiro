import { useState } from 'react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

// Ajuste os tipos conforme necessário
type Categoria = { id: string; name: string; type: string };
type Carteira = { id: string; name: string };
type Tag = { id: string; name: string };

export default function QuickRendaForm() {
  const [form, setForm] = useState({
    description: '',
    amount: '',
    date: '',
    categoryId: '',
    walletId: '',
    tags: [] as string[],
    isFixed: false,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [wallets, setWallets] = useState<Carteira[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};
    if (!form.description) newErrors.description = 'Descrição é obrigatória.';
    if (!form.amount || isNaN(Number(form.amount))) newErrors.amount = 'Valor é obrigatório.';
    if (!form.date) newErrors.date = 'Data é obrigatória.';
    if (!form.walletId) newErrors.walletId = 'Carteira é obrigatória.';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
        <div>
          <Label htmlFor="description">Descrição</Label>
          <Input
            id="description"
            placeholder="Ex: Salário"
            value={form.description}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
          {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
        </div>
        <div>
          <Label htmlFor="amount">Valor</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={form.amount}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setForm((f) => ({ ...f, amount: e.target.value }))
            }
          />
          {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
        </div>
        <div>
          <Label htmlFor="date">Data</Label>
          <Input
            id="date"
            type="date"
            value={form.date}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setForm((f) => ({ ...f, date: e.target.value }))
            }
          />
          {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
        </div>
        <div>
          <Label htmlFor="category">Categoria</Label>
          <select
            id="category"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.categoryId}
            onChange={(e) => {
              if (e.target.value === '__create__') setShowCategoryModal(true);
              else setForm((f) => ({ ...f, categoryId: e.target.value }));
            }}
          >
            <option value="__create__">➕ Criar categoria</option>
            <option value="">Sem categoria</option>
            {categories
              .filter((c) => c.type === 'INCOME' || c.type === 'BOTH')
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </div>
        <div>
          <Label htmlFor="wallet">Carteira</Label>
          <select
            id="wallet"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.walletId}
            onChange={(e) => {
              if (e.target.value === '__create__') setShowWalletModal(true);
              else setForm((f) => ({ ...f, walletId: e.target.value }));
            }}
          >
            <option value="__create__">➕ Criar carteira</option>
            <option value="">Selecione</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          {errors.walletId && <p className="text-red-500 text-xs mt-1">{errors.walletId}</p>}
        </div>
        <div>
          <Label htmlFor="tag">Tag</Label>
          <select
            id="tag"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.tags[0] || ''}
            onChange={(e) => {
              if (e.target.value === '__create__') setShowTagModal(true);
              else setForm((f) => ({ ...f, tags: e.target.value ? [e.target.value] : [] }));
            }}
          >
            <option value="__create__">➕ Criar tag</option>
            <option value="">Sem tag</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            id="isFixed"
            checked={form.isFixed}
            onChange={(e) => setForm((f) => ({ ...f, isFixed: e.target.checked }))}
            className="h-5 w-5 rounded border border-input bg-background text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-150"
          />
          <Label htmlFor="isFixed" className="ml-1 select-none cursor-pointer text-sm">
            Renda Fixa?
          </Label>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button type="submit">Cadastrar</Button>
      </div>
    </form>
  );
}
