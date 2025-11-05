import { useState, useEffect, useRef, useCallback } from 'react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { MultiTagSelector } from '../ui/multi-tag-selector';
import { SmartSuggestionsCard } from '../ui/smart-suggestions-card';
import { useSmartSuggestions } from '../../hooks/use-smart-suggestions';

type Categoria = { id: string; name: string; type: string };
type Carteira = { id: string; name: string };
type Tag = { id: string; name: string };
type CreditCard = { id: string; name: string };

type PaymentType = 'DEBIT' | 'CREDIT' | 'PIX_TRANSFER' | 'CASH' | 'OTHER';

export default function QuickRendaForm() {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    date: today,
    categoryId: '',
    walletId: '',
    creditCardId: '',
    paymentType: 'DEBIT' as PaymentType,
    tags: [] as string[],
    isRecurring: false,
  });

  const amountRef = useRef<HTMLInputElement | null>(null);
  const categorySelectRef = useRef<HTMLSelectElement | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [wallets, setWallets] = useState<Carteira[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [recentCategories, setRecentCategories] = useState<string[]>([]);

  // Hook de sugestões inteligentes
  const smartSuggestions = useSmartSuggestions({
    description: form.description,
    transactionType: 'INCOME',
    categories: categories,
    tags: tags,
    debounceMs: 800
    // Removido callbacks de pré-seleção para evitar aplicação automática
  });

  useEffect(() => {
    (async () => {
      try {
        const [catRes, walRes, cardRes, tagRes] = await Promise.all([
          fetch('/api/categories?&_=' + Date.now()),
          fetch('/api/wallets?&_=' + Date.now()),
          fetch('/api/credit-cards?&_=' + Date.now()),
          fetch('/api/tags?&_=' + Date.now()),
        ]);
        if (catRes.ok) setCategories(await catRes.json());
        if (walRes.ok) setWallets(await walRes.json());
        if (cardRes.ok) setCreditCards(await cardRes.json());
        if (tagRes.ok) setTags(await tagRes.json());
      } catch {}
    })();
  }, []);

  useEffect(() => {
    try {
      const data = localStorage.getItem('recent_income_categories');
      if (data) setRecentCategories(JSON.parse(data));
    } catch {}
  }, []);

  const persistRecents = useCallback((next: string[]) => {
    setRecentCategories(next);
    try {
      localStorage.setItem('recent_income_categories', JSON.stringify(next));
    } catch {}
  }, []);

  useEffect(() => {
    amountRef.current?.focus();
  }, []);

  const updateRecents = (categoryId: string) => {
    if (!categoryId) return;
    persistRecents([categoryId, ...recentCategories.filter((c) => c !== categoryId)].slice(0, 10));
  };

  const [showToast, setShowToast] = useState(false);
  useEffect(() => {
    if (!showToast) return;
    const t = setTimeout(() => setShowToast(false), 3000);
    return () => clearTimeout(t);
  }, [showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};
    if (!form.description) newErrors.description = 'Descrição é obrigatória.';
    if (!form.amount || isNaN(Number(form.amount))) newErrors.amount = 'Valor é obrigatório.';
    if (!form.date) newErrors.date = 'Data é obrigatória.';
    
    // Validação baseada no tipo de pagamento
    if (form.paymentType === 'CREDIT') {
      if (!form.creditCardId) newErrors.creditCardId = 'Cartão de crédito é obrigatório.';
    } else {
      if (!form.walletId) newErrors.walletId = 'Carteira é obrigatória.';
    }
    
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    // Processar tags sugeridas - criar tags que ainda não existem
    const processedTags: string[] = [];
    for (const tagId of form.tags || []) {
      if (tagId.startsWith('suggested:')) {
        // É uma tag sugerida, precisa criar
        const tagName = tagId.replace('suggested:', '');
        try {
          const response = await fetch('/api/tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: tagName })
          });
          if (response.ok) {
            const newTag = await response.json();
            setTags(prev => [...prev, newTag]);
            processedTags.push(newTag.id);
          } else {
            console.error('Erro ao criar tag sugerida:', tagName);
            // Se não conseguir criar, ignora a tag
          }
        } catch (error) {
          console.error('Erro ao criar tag sugerida:', tagName, error);
          // Se não conseguir criar, ignora a tag
        }
      } else {
        // Tag normal, mantém o ID
        processedTags.push(tagId);
      }
    }

    // Criar categoria sugerida se necessário
    let finalCategoryId: string | null = form.categoryId;
    if (form.categoryId?.startsWith('suggested:')) {
      const categoryName = form.categoryId.replace('suggested:', '');
      try {
        const response = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: categoryName, 
            type: 'INCOME',
            color: '#10B981' // cor verde padrão para categorias de renda sugeridas
          })
        });
        if (response.ok) {
          const newCategory = await response.json();
          setCategories(prev => [...prev, newCategory]);
          finalCategoryId = newCategory.id;
        } else {
          console.error('Erro ao criar categoria sugerida:', categoryName);
          finalCategoryId = null;
        }
      } catch (error) {
        console.error('Erro ao criar categoria sugerida:', categoryName, error);
        finalCategoryId = null;
      }
    }

    if (finalCategoryId) {
      updateRecents(finalCategoryId);
    }

    const payload = {
      description: form.description,
      amount: Number(form.amount),
      date: form.date,
      type: form.isRecurring ? 'RECURRING' : 'PUNCTUAL',
      isRecurring: form.isRecurring,
      categoryId: finalCategoryId || null,
      walletId: form.paymentType === 'CREDIT' ? null : (form.walletId || null),
      creditCardId: form.paymentType === 'CREDIT' ? (form.creditCardId || null) : null,
      paymentType: form.paymentType,
      tags: processedTags,
      // Se for recorrente, adiciona os campos necessários
      ...(form.isRecurring && {
        startDate: form.date, // Usa a data do formulário como início
        endDate: null, // Sem data de término (recorrência infinita)
        dayOfMonth: (() => {
          const dateStr = form.date;
          // Extrai o dia diretamente da string (formato YYYY-MM-DD ou DD/MM/YYYY)
          if (dateStr.includes('-')) {
            return parseInt(dateStr.split('-')[2], 10);
          } else if (dateStr.includes('/')) {
            return parseInt(dateStr.split('/')[0], 10);
          }
          return 1; // fallback
        })(),
      }),
    } as any;

    try {
      const res = await fetch('/api/incomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
  setErrors({ ...newErrors, general: data.error || 'Erro ao cadastrar ganho' });
        return;
      }
      const keptCategory = form.categoryId;
      const keptPaymentType = form.paymentType;
      const keptWalletId = form.walletId;
      const keptCreditCardId = form.creditCardId;
  setForm((f) => ({ 
        ...f, 
        description: '', 
        amount: '', 
        date: today, 
        categoryId: keptCategory, 
        paymentType: keptPaymentType,
        walletId: keptWalletId,
        creditCardId: keptCreditCardId,
        tags: [] 
      }));
      requestAnimationFrame(() => {
        amountRef.current?.focus();
        setShowToast(true);
      });
    } catch (err) {
      setErrors({ ...newErrors, general: 'Erro ao conectar com o servidor' });
    }
  };

  const handleCategoryKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
    if (recentCategories.length === 0) return;
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const current = form.categoryId;
    const list = recentCategories.filter((id) => categories.find((c) => c.id === id));
    if (list.length === 0) return;
    const idx = list.indexOf(current);
    let nextId = list[0];
    if (e.key === 'ArrowDown') nextId = idx === -1 ? list[0] : list[(idx + 1) % list.length];
    if (e.key === 'ArrowUp') nextId = idx === -1 ? list[list.length - 1] : list[(idx - 1 + list.length) % list.length];
    setForm((f) => ({ ...f, categoryId: nextId }));
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="description">Descrição</Label>
          <Input id="description" placeholder="Ex: Salário, Freelance, Vendas..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          
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
                    // Recarrega categorias para incluir a nova
                    const res = await fetch('/api/categories');
                    if (res.ok) setCategories(await res.json());
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
          <Label htmlFor="amount">Valor</Label>
          <Input id="amount" type="number" step="0.01" ref={amountRef} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e as any); }} />
          {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
        </div>
        <div>
          <Label htmlFor="date">Data</Label>
          <Input id="date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
        </div>
        <div>
          <Label htmlFor="category">Categoria</Label>
          <select id="category" ref={categorySelectRef} onKeyDown={handleCategoryKeyDown} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.categoryId} onChange={(e) => { 
            if (e.target.value === '__create__') {
              // Criar categoria 
            } else {
              // Detecta se uma categoria sugerida foi removida
              if (form.categoryId?.startsWith('suggested:') && e.target.value !== form.categoryId) {
                const categoryName = form.categoryId.replace('suggested:', '');
                smartSuggestions.dismissCategorySuggestion(categoryName);
              }
              
              setForm((f) => ({ ...f, categoryId: e.target.value }));
            }
          }}>
            <option value="__create__">➕ Criar categoria</option>
            <option value="">Sem categoria</option>
            {/* Sugestão da IA como opção especial */}
            {smartSuggestions.suggestions?.category?.isNew && (
              <option value={`suggested:${smartSuggestions.suggestions.category.name}`} className="text-green-600 bg-green-50 font-medium">
                🤖 {smartSuggestions.suggestions.category.name} (sugestão IA)
              </option>
            )}
            {categories.filter((c) => c.type === 'INCOME' || c.type === 'BOTH').map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            {recentCategories.filter((id) => !categories.find((c) => c.id === id)).map((id) => (<option key={id} value={id}>(Recente) {id}</option>))}
          </select>
        </div>
        <div>
          <Label htmlFor="paymentType">Tipo de Pagamento</Label>
          <select 
            id="paymentType" 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
            value={form.paymentType} 
            onChange={(e) => setForm((f) => ({ 
              ...f, 
              paymentType: e.target.value as PaymentType,
              walletId: e.target.value === 'CREDIT' ? '' : f.walletId,
              creditCardId: e.target.value === 'CREDIT' ? f.creditCardId : ''
            }))}
          >
            <option value="DEBIT">Débito</option>
            <option value="CREDIT">Crédito</option>
            <option value="PIX_TRANSFER">PIX/Transferência</option>
            <option value="CASH">Dinheiro</option>
            <option value="OTHER">Outro</option>
          </select>
        </div>
        {form.paymentType === 'CREDIT' ? (
          <div>
            <Label htmlFor="creditCard">Cartão de Crédito</Label>
            <select 
              id="creditCard" 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
              value={form.creditCardId} 
              onChange={(e) => setForm((f) => ({ ...f, creditCardId: e.target.value }))}
            >
              <option value="">Selecione</option>
              {creditCards.map((cc) => (<option key={cc.id} value={cc.id}>{cc.name}</option>))}
            </select>
            {errors.creditCardId && <p className="text-red-500 text-xs mt-1">{errors.creditCardId}</p>}
          </div>
        ) : (
          <div>
            <Label htmlFor="wallet">Carteira</Label>
            <select id="wallet" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.walletId} onChange={(e) => { if (e.target.value === '__create__') {} else setForm((f) => ({ ...f, walletId: e.target.value })); }}>
              <option value="__create__">➕ Criar carteira</option>
              <option value="">Selecione</option>
              {wallets.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
            </select>
            {errors.walletId && <p className="text-red-500 text-xs mt-1">{errors.walletId}</p>}
          </div>
        )}
        <div>
          <Label htmlFor="tags">Tags</Label>
          <MultiTagSelector
            selectedTags={form.tags}
            onTagsChange={(newTags) => {
              // Detecta tags removidas
              const removedTags = form.tags.filter(tagId => !newTags.includes(tagId));
              
              // Dispensa sugestões para tags sugeridas que foram removidas
              removedTags.forEach(removedTagId => {
                if (removedTagId.startsWith('suggested:')) {
                  const tagName = removedTagId.replace('suggested:', '');
                  smartSuggestions.dismissTagSuggestion(tagName);
                }
              });
              
              setForm(f => ({ ...f, tags: newTags }));
            }}
            availableTags={tags}
            suggestedTags={smartSuggestions.suggestions?.tags.map(tag => tag.name) || []}
            placeholder="Selecione ou crie tags..."
            maxTags={5}
            onCreateTag={async (tagName) => {
              try {
                const response = await fetch('/api/tags', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: tagName })
                });
                if (response.ok) {
                  const newTag = await response.json();
                  setTags(prev => [...prev, newTag]);
                  return newTag;
                }
              } catch (error) {
                console.error('Erro ao criar tag:', error);
              }
              return null;
            }}
          />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input type="checkbox" id="isRecurring" checked={form.isRecurring} onChange={(e) => setForm((f) => ({ ...f, isRecurring: e.target.checked }))} className="h-5 w-5 rounded border border-input bg-background text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-150" />
          <Label htmlFor="isRecurring" className="ml-1 select-none cursor-pointer text-sm">Receita Recorrente?</Label>
        </div>
      </div>

  {showToast && <div className="text-sm text-green-600 mb-2">Ganho cadastrado</div>}

      <div className="flex justify-end gap-2 mt-4">
        <Button type="submit">Cadastrar</Button>
      </div>
    </form>
  );
}
