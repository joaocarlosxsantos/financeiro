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

interface CreditExpenseFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  expenseId?: string; // Se fornecido, o formulário será usado para edição
}

export default function CreditExpenseForm({ onSuccess, onCancel, expenseId }: CreditExpenseFormProps) {
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

  // Hook de sugestões inteligentes (apenas no modo criação)
  const smartSuggestions = useSmartSuggestions({
    description: expenseId ? '' : form.description, // Desabilita sugestões no modo edição
    transactionType: 'EXPENSE',
    categories: categories,
    tags: tags,
    debounceMs: 800,
    onCategoryPreselect: (categoryId) => {
      if (!expenseId) { // Só aplica sugestões no modo criação
        setForm(f => ({ ...f, categoryId }));
      }
    },
    onTagsPreselect: (tagIds) => {
      if (!expenseId) { // Só aplica sugestões no modo criação
        setForm(f => ({ ...f, tags: [...f.tags, ...tagIds.filter(id => !f.tags.includes(id))] }));
      }
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  // Carregar dados do gasto para edição ou limpar form quando não está editando
  useEffect(() => {
    const loadExpenseData = async () => {
      if (!expenseId) {
        // Se não há expenseId, limpar o formulário para modo de criação
        const today = new Date().toISOString().slice(0, 10);
        setForm({
          description: '',
          amount: '',
          purchaseDate: today,
          categoryId: '',
          creditCardId: '',
          installments: 1,
          tags: [],
        });
        console.log('🔄 Formulário limpo para modo de criação');
        return;
      }
      
      // Carrega imediatamente os dados do gasto, sem aguardar outras listas
      
      try {
        setLoading(true);
        const response = await fetch(`/api/credit-expenses/${expenseId}`);
        
        if (!response.ok) {
          throw new Error('Erro ao carregar dados do gasto');
        }

        const expense = await response.json();
        console.log('🔄 Dados do gasto carregados para edição:', expense);
        
        setForm({
          description: expense.description,
          amount: expense.amount.toString(),
          purchaseDate: expense.purchaseDate.slice(0, 10), // YYYY-MM-DD format
          categoryId: expense.categoryId || '',
          creditCardId: expense.creditCardId,
          installments: expense.installments,
          tags: expense.tags ? expense.tags.map((tag: Tag) => tag.id) : [],
        });
        
        console.log('✅ Formulário preenchido com:', {
          description: expense.description,
          amount: expense.amount.toString(),
          purchaseDate: expense.purchaseDate.slice(0, 10),
          categoryId: expense.categoryId || '',
          creditCardId: expense.creditCardId,
          installments: expense.installments,
          tags: expense.tags ? expense.tags.map((tag: Tag) => tag.id) : [],
        });
      } catch (error) {
        console.error('Erro ao carregar gasto:', error);
        setErrors({ general: 'Erro ao carregar dados do gasto' });
      } finally {
        setLoading(false);
      }
    };

    if (expenseId) {
      loadExpenseData();
    }
  }, [expenseId]); // Remove dependências desnecessárias para carregamento mais rápido

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

      const url = expenseId ? `/api/credit-expenses/${expenseId}` : '/api/credit-expenses';
      const method = expenseId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
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
        const action = expenseId ? 'atualizar' : 'cadastrar';
        setErrors({ general: errorData.error || `Erro ao ${action} gasto` });
        return;
      }

      // Sucesso - deixar hook limpar as sugestões
      
      onSuccess();
    } catch (error) {
      setErrors({ general: 'Erro interno do servidor' });
    } finally {
      setLoading(false);
    }
  };

  const installmentValue = form.amount ? (parseFloat(form.amount) / form.installments) : 0;
  
  // Mostrar loading quando está carregando dados para edição
  if (expenseId && loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Carregando dados do gasto...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.general && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
          {errors.general}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="description">Descrição da Compra *</Label>
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
          
          {/* Sugestões Inteligentes - apenas no modo criação */}
          {!expenseId && smartSuggestions.suggestions && (
            <div className="mt-2">
              <SmartSuggestionsCard
                suggestions={smartSuggestions.suggestions}
                isLoading={smartSuggestions.isLoading}
                isPreselected={true}
                onAcceptCategory={async () => {
                  console.log('🎯 DEBUG - Antes de aceitar categoria. Sugestão:', smartSuggestions.suggestions?.category);
                  const categoryId = await smartSuggestions.acceptCategorySuggestion();
                  console.log('🎯 DEBUG - Category ID retornado:', categoryId);
                  if (categoryId) {
                    console.log('🎯 DEBUG - Aplicando categoria no form:', categoryId);
                    setForm(f => ({ ...f, categoryId }));
                    // Recarrega categorias para incluir a nova
                    const res = await fetch('/api/categories?type=EXPENSE');
                    if (res.ok) setCategories(await res.json());
                  } else {
                    console.log('❌ DEBUG - Category ID não retornado ou null');
                  }
                }}
                onAcceptTag={async (tagName) => {
                  const tagId = await smartSuggestions.acceptTagSuggestion(tagName);
                  if (tagId) {
                    setForm(f => ({ ...f, tags: [...f.tags, tagId] }));
                    // Recarrega tags para incluir a nova
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

        <div>
          <Label htmlFor="amount">Valor Total *</Label>
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
            {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
              <option key={num} value={num}>
                {num}x {installmentValue > 0 && `(R$ ${(installmentValue).toFixed(2)} cada)`}
              </option>
            ))}
          </select>
          {errors.installments && (
            <p className="text-red-500 text-xs mt-1">{errors.installments}</p>
          )}
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
          <Label htmlFor="creditCard">Cartão de Crédito *</Label>
          <select
            id="creditCardId"
            value={form.creditCardId}
            onChange={(e) => setForm(f => ({ ...f, creditCardId: e.target.value }))}
            className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${errors.creditCardId ? 'border-red-500' : ''}`}
          >
            <option value="">Selecione um cartão</option>
            {(creditCards || []).map((card) => (
              <option key={card.id} value={card.id}>
                {card.name} - {card.bank?.name || 'Sem banco'}
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
            {(categories || []).map((category) => (
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
            onTagsChange={(newTags) => {
              setForm(f => ({ ...f, tags: newTags }));
            }}
            availableTags={tags}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {expenseId ? 'Atualizar Gasto' : 'Cadastrar Gasto'}
        </Button>
      </div>
    </form>
  );
}