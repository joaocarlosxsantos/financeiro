/**
 * Exemplo de Integração dos Componentes de Performance e Mobile
 * Demonstra como usar os novos componentes otimizados
 */

import React, { memo, useState, Suspense } from 'react';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useCachedData } from '@/hooks/use-cache';

// Imports dos componentes otimizados
import { 
  LazyWrapper, 
  LazyRender, 
  VirtualScroll,
  OptimizedList,
  SkeletonCard,
  SkeletonTable,
  useDebounce,
  useIntersectionObserver
} from '@/components/ui/performance';

import {
  MobileInput,
  MobileButton,
  MobileFormGroup,
  MobileFormActions,
  MobileSelect
} from '@/components/ui/mobile-forms';

import {
  MobileModal,
  MobileModalHeader,
  MobileModalContent,
  MobileModalFooter,
  MobileBottomSheet,
  MobileAlertDialog
} from '@/components/ui/mobile-modals';

import {
  MobileTable,
  MobileListItem,
  MobileExpandableListItem,
  MobileActionListItem
} from '@/components/ui/mobile-tables';

// ============ EXEMPLO: PÁGINA DE TRANSAÇÕES OTIMIZADA ============

const OptimizedTransactionsPage = memo(() => {
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  
  // Debounce da busca para performance
  const debouncedSearch = useDebounce(searchTerm, 300);
  
  // Cache de dados das transações
  const { data: transactions, loading, error } = useCachedData(
    `transactions-${debouncedSearch}`,
    async () => {
      const response = await fetch(`/api/transactions?search=${debouncedSearch}`);
      if (!response.ok) throw new Error('Erro ao carregar transações');
      return response.json();
    },
    { dependencies: [debouncedSearch] }
  );

  // Configuração das colunas para a tabela mobile
  const columns = [
    {
      key: 'description',
      title: 'Descrição',
      mobileOnly: false
    },
    {
      key: 'amount',
      title: 'Valor',
      render: (value: number) => 
        new Intl.NumberFormat('pt-BR', { 
          style: 'currency', 
          currency: 'BRL' 
        }).format(value)
    },
    {
      key: 'date',
      title: 'Data',
      mobileHidden: true, // Esconder no mobile
      render: (value: string) => new Date(value).toLocaleDateString('pt-BR')
    },
    {
      key: 'category',
      title: 'Categoria',
      mobileHidden: true
    }
  ];

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header com busca otimizada para mobile */}
      <div className="space-y-4">
        <h1 className={`font-bold ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
          Transações
        </h1>
        
        <MobileInput
          label="Buscar transações"
          placeholder="Digite para buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={<SearchIcon />}
        />
      </div>

      {/* Botões de ação otimizados para mobile */}
      <MobileFormActions>
        <MobileButton 
          onClick={() => setShowModal(true)}
          fullWidth={isMobile}
        >
          Nova Transação
        </MobileButton>
        
        <MobileButton 
          variant="outline" 
          onClick={() => setShowBottomSheet(true)}
          fullWidth={isMobile}
        >
          Filtros
        </MobileButton>
      </MobileFormActions>

      {/* Lista/Tabela otimizada com lazy loading */}
      <LazyRender fallback={<SkeletonTable rows={5} />}>
        <MobileTable
          data={transactions || []}
          columns={columns}
          keyExtractor={(item: any) => item.id}
          loading={loading}
          searchable={false} // Já temos busca externa
          emptyMessage="Nenhuma transação encontrada"
          onRowClick={(transaction) => {
            console.log('Transação clicada:', transaction);
          }}
        />
      </LazyRender>

      {/* Modal otimizado para mobile */}
      <MobileModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        size={isMobile ? 'full' : 'lg'}
      >
        <MobileModalHeader
          title="Nova Transação"
          subtitle="Adicione uma nova transação"
        />
        
        <MobileModalContent>
          <TransactionForm onClose={() => setShowModal(false)} />
        </MobileModalContent>
      </MobileModal>

      {/* Bottom Sheet para filtros (mobile) */}
      <MobileBottomSheet
        isOpen={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        title="Filtros"
      >
        <FiltersForm onClose={() => setShowBottomSheet(false)} />
      </MobileBottomSheet>
    </div>
  );
});

OptimizedTransactionsPage.displayName = 'OptimizedTransactionsPage';

// ============ EXEMPLO: FORMULÁRIO OTIMIZADO ============

const TransactionForm = memo(({ onClose }: { onClose: () => void }) => {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) throw new Error('Erro ao salvar');
      
      onClose();
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <MobileFormGroup title="Informações Básicas">
        <MobileInput
          label="Descrição"
          placeholder="Digite a descrição"
          required
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            description: e.target.value 
          }))}
        />
        
        <MobileInput
          label="Valor"
          type="number"
          placeholder="0,00"
          required
          value={formData.amount}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            amount: e.target.value 
          }))}
        />
      </MobileFormGroup>

      <MobileFormGroup title="Detalhes">
        <MobileSelect
          label="Categoria"
          placeholder="Selecione uma categoria"
          required
          value={formData.category}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            category: e.target.value 
          }))}
          options={[
            { value: 'food', label: 'Alimentação' },
            { value: 'transport', label: 'Transporte' },
            { value: 'entertainment', label: 'Entretenimento' }
          ]}
        />
        
        <MobileInput
          label="Data"
          type="date"
          required
          value={formData.date}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            date: e.target.value 
          }))}
        />
      </MobileFormGroup>

      <MobileFormActions>
        <MobileButton 
          type="button" 
          variant="outline" 
          onClick={onClose}
          fullWidth
        >
          Cancelar
        </MobileButton>
        
        <MobileButton 
          type="submit" 
          loading={loading}
          fullWidth
        >
          Salvar
        </MobileButton>
      </MobileFormActions>
    </form>
  );
});

TransactionForm.displayName = 'TransactionForm';

// ============ EXEMPLO: LISTA OTIMIZADA COM VIRTUAL SCROLL ============

const OptimizedTransactionsList = memo(({ transactions }: { transactions: any[] }) => {
  const isMobile = useIsMobile();
  const [ref, isVisible] = useIntersectionObserver();

  // Renderizar apenas quando visível
  if (!isVisible) {
    return <div ref={ref} className="h-64 bg-muted animate-pulse rounded-lg" />;
  }

  // Se muitos itens, usar virtual scroll
  if (transactions.length > 100) {
    return (
      <div ref={ref}>
        <VirtualScroll
          items={transactions}
          itemHeight={isMobile ? 80 : 60}
          containerHeight={400}
          renderItem={(transaction, index) => (
            <MobileListItem
              key={transaction.id}
              title={transaction.description}
              subtitle={new Intl.NumberFormat('pt-BR', { 
                style: 'currency', 
                currency: 'BRL' 
              }).format(transaction.amount)}
              description={transaction.category}
              onClick={() => console.log('Transaction:', transaction)}
            />
          )}
        />
      </div>
    );
  }

  // Lista normal otimizada
  return (
    <div ref={ref}>
      <OptimizedList
        items={transactions}
        keyExtractor={(item) => item.id}
        renderItem={(transaction) => (
          <MobileListItem
            title={transaction.description}
            subtitle={new Intl.NumberFormat('pt-BR', { 
              style: 'currency', 
              currency: 'BRL' 
            }).format(transaction.amount)}
            description={transaction.category}
            onClick={() => console.log('Transaction:', transaction)}
          />
        )}
        emptyMessage="Nenhuma transação encontrada"
      />
    </div>
  );
});

OptimizedTransactionsList.displayName = 'OptimizedTransactionsList';

// ============ EXEMPLO: FILTROS FORM ============

const FiltersForm = memo(({ onClose }: { onClose: () => void }) => {
  return (
    <div className="space-y-6">
      <MobileFormGroup title="Período">
        <MobileInput
          label="Data inicial"
          type="date"
        />
        <MobileInput
          label="Data final"
          type="date"
        />
      </MobileFormGroup>

      <MobileFormGroup title="Valores">
        <MobileInput
          label="Valor mínimo"
          type="number"
          placeholder="0,00"
        />
        <MobileInput
          label="Valor máximo"
          type="number"
          placeholder="0,00"
        />
      </MobileFormGroup>

      <MobileFormActions orientation="vertical">
        <MobileButton fullWidth>
          Aplicar Filtros
        </MobileButton>
        <MobileButton variant="outline" onClick={onClose} fullWidth>
          Fechar
        </MobileButton>
      </MobileFormActions>
    </div>
  );
});

FiltersForm.displayName = 'FiltersForm';

// ============ PLACEHOLDER COMPONENTS ============

const SearchIcon = () => <div>🔍</div>;

// ============ EXPORTS ============

export {
  OptimizedTransactionsPage,
  TransactionForm,
  OptimizedTransactionsList,
  FiltersForm
};