'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { MultiTagSelector } from '../ui/multi-tag-selector';
import { SmartSuggestionsCard } from '../ui/smart-suggestions-card';
import { useSmartSuggestions } from '@/hooks/use-smart-suggestions';
import { Loader2 } from 'lucide-react';

interface CreditCard {
  id: string;
  name: string;
  limit: number;
  bank?: {
    id: string;
    name: string;
  } | null;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

interface Tag {
  id: string;
  name: string;
}

interface QuickCardFormProps {
  onSuccess?: () => void;
}

export default function QuickCardForm({ onSuccess }: QuickCardFormProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    purchaseDate: today,
    categoryId: '',
    creditCardId: '',
    installments: 1,
    tags: [] as string[],
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  // Hook de sugestões inteligentes
  const smartSuggestions = useSmartSuggestions({
    description: form.description,
    transactionType: 'EXPENSE',
    categories: categories,
    tags: tags,
    debounceMs: 800
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [cardsRes, categoriesRes, tagsRes] = await Promise.all([
        fetch('/api/credit-cards'),
        fetch('/api/categories?type=EXPENSE'),
        fetch('/api/tags'),
      ]);

      if (cardsRes.ok) setCreditCards(await cardsRes.json());
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
      if (tagsRes.ok) setTags(await tagsRes.json());
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    }

    const amount = parseFloat(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) {
      newErrors.amount = 'Valor deve ser maior que zero';
    }

    if (!form.creditCardId) {
      newErrors.creditCardId = 'Cartão de crédito é obrigatório';
    }

    if (!form.purchaseDate) {
      newErrors.purchaseDate = 'Data da compra é obrigatória';
    }

    if (form.installments < 1 || form.installments > 12) {
      newErrors.installments = 'Parcelas devem estar entre 1 e 12';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      // Processar tags sugeridas
      const processedTags: string[] = [];
      for (const tagId of form.tags) {
        if (tagId.startsWith('suggested:')) {
          const tagName = tagId.replace('suggested:', '');
          const tagRes = await fetch('/api/tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: tagName }),
          });
          if (tagRes.ok) {
            const newTag = await tagRes.json();
            processedTags.push(newTag.id);
            setTags(prev => [...prev, newTag]);
          }
        } else {
          processedTags.push(tagId);
        }
      }

      const response = await fetch('/api/credit-expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: form.description,
          amount: parseFloat(form.amount),
          purchaseDate: form.purchaseDate,
          categoryId: form.categoryId || null,
          creditCardId: form.creditCardId,
          installments: form.installments,
          tags: processedTags,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setErrors({ general: errorData.error || 'Erro ao cadastrar gasto' });
        return;
      }

      // Limpar formulário
      setForm({
        description: '',
        amount: '',
        purchaseDate: today,
        categoryId: '',
        creditCardId: '',
        installments: 1,
        tags: [],
      });

      if (onSuccess) onSuccess();
    } catch (error) {
      setErrors({ general: 'Erro interno do servidor' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.general && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
          {errors.general}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="description">Descrição *</Label>
          <Input
            id="description"
            value={form.description}
            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Ex: Compra no supermercado"
            className={errors.description ? 'border-red-500' : ''}
          />
          {errors.description && (
            <p className="text-red-500 text-xs mt-1">{errors.description}</p>
          )}
          
          {/* Sugestões Inteligentes */}
          {smartSuggestions.suggestions && (
            <div className="mt-2">
              <SmartSuggestionsCard
                suggestions={smartSuggestions.suggestions}
                isLoading={smartSuggestions.isLoading}
                onAcceptCategory={async () => {
                  const categoryId = await smartSuggestions.acceptCategorySuggestion();
                  if (categoryId) {
                    setForm(f => ({ ...f, categoryId }));
                    const res = await fetch('/api/categories?type=EXPENSE');
                    if (res.ok) setCategories(await res.json());
                  }
                }}
                onAcceptTag={async (tagName) => {
                  const tagId = await smartSuggestions.acceptTagSuggestion(tagName);
                  if (tagId) {
                    setForm(f => ({ ...f, tags: [...f.tags, tagId] }));
                    const res = await fetch('/api/tags');
                    if (res.ok) setTags(await res.json());
                  }
                }}
                onDismiss={smartSuggestions.dismissSuggestions}
                className="text-sm"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="amount">Valor *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0,00"
              className={errors.amount ? 'border-red-500' : ''}
            />
            {errors.amount && (
              <p className="text-red-500 text-xs mt-1">{errors.amount}</p>
            )}
          </div>

          <div>
            <Label htmlFor="installments">Parcelas *</Label>
            <select
              id="installments"
              value={form.installments}
              onChange={(e) => setForm(f => ({ ...f, installments: parseInt(e.target.value) }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(num => {
                const amount = form.amount ? parseFloat(form.amount) : 0;
                const installmentValue = amount > 0 ? (amount / num) : 0;
                const formattedValue = installmentValue.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                });
                
                return (
                  <option key={num} value={num}>
                    {num}x {amount > 0 ? formattedValue : ''}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor="purchaseDate">Data da Compra *</Label>
          <Input
            id="purchaseDate"
            type="date"
            value={form.purchaseDate}
            onChange={(e) => setForm(f => ({ ...f, purchaseDate: e.target.value }))}
            className={errors.purchaseDate ? 'border-red-500' : ''}
          />
          {errors.purchaseDate && (
            <p className="text-red-500 text-xs mt-1">{errors.purchaseDate}</p>
          )}
        </div>

        <div>
          <Label htmlFor="creditCard">Cartão *</Label>
          <select
            id="creditCardId"
            value={form.creditCardId}
            onChange={(e) => setForm(f => ({ ...f, creditCardId: e.target.value }))}
            className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${errors.creditCardId ? 'border-red-500' : ''}`}
          >
            <option value="">Selecione um cartão</option>
            {creditCards.map((card) => (
              <option key={card.id} value={card.id}>
                {card.name} {card.bank?.name ? `- ${card.bank.name}` : ''}
              </option>
            ))}
          </select>
          {errors.creditCardId && (
            <p className="text-red-500 text-xs mt-1">{errors.creditCardId}</p>
          )}
        </div>

        <div>
          <Label htmlFor="category">Categoria</Label>
          <select
            id="category"
            value={form.categoryId}
            onChange={(e) => setForm(f => ({ ...f, categoryId: e.target.value }))}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Selecione uma categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="tags">Tags</Label>
          <MultiTagSelector
            selectedTags={form.tags}
            onTagsChange={(newTags) => setForm(f => ({ ...f, tags: newTags }))}
            availableTags={tags}
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={loading} className="w-full">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Cadastrar
        </Button>
      </div>
    </form>
  );
}
