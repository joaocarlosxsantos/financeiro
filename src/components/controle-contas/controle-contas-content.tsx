'use client';

/**
 * Controle Contas Content Component
 * 
 * Componente principal do módulo de Controle de Contas que orquestra:
 * 1. Hook de gerenciamento de estado (use-controle-contas-state)
 * 2. Componente de cards com métricas
 * 3. Componente de grupos e contas
 * 4. Barra de busca e ações
 */

import { useControleContasState } from '@/hooks/use-controle-contas-state';
import { ControleContasCards } from './controle-contas-cards';
import { ControleContasGroups } from './controle-contas-groups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Users, Search } from 'lucide-react';
import Link from 'next/link';

export function ControleContasContent() {
  const state = useControleContasState();

  return (
    <div className="space-y-6 flex-1 min-h-screen flex flex-col px-2 sm:px-4 pb-24">
      {/* Barra de Busca e Ações */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conta ou grupo..."
            value={state.query}
            onChange={(e) => state.setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Button asChild className="flex-1 sm:flex-none">
            <Link href="/controle-contas/contas">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Contas
            </Link>
          </Button>
          <Button asChild variant="secondary" className="flex-1 sm:flex-none">
            <Link href="/controle-contas/grupos">
              <Users className="h-4 w-4 mr-2" />
              Gerenciar Grupos
            </Link>
          </Button>
        </div>
      </div>

      {/* Cards com Métricas */}
      <ControleContasCards
        groupsCount={state.groupsCount}
        total={state.total}
        billsCount={state.filtered.length}
      />

      {/* Mensagem de Erro */}
      {state.error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">
          {state.error}
        </div>
      )}

      {/* Lista de Grupos */}
      <ControleContasGroups
        groupedData={state.groupedData}
        groupMembers={state.groupMembers}
        loading={state.loading}
      />
    </div>
  );
}
