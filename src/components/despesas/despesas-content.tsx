'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { DespesasFixasTab } from './despesas-fixas-tab'
import { DespesasVariaveisTab } from './despesas-variaveis-tab'

export function DespesasContent() {
  const [activeTab, setActiveTab] = useState('fixas')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Despesas</h1>
          <p className="text-gray-600">Gerencie suas despesas fixas e variáveis</p>
        </div>
        
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Despesa
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fixas">Despesas Fixas</TabsTrigger>
          <TabsTrigger value="variaveis">Despesas Variáveis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="fixas" className="space-y-4">
          <DespesasFixasTab />
        </TabsContent>
        
        <TabsContent value="variaveis" className="space-y-4">
          <DespesasVariaveisTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
