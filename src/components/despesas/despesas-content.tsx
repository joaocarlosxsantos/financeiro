'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 gap-2 bg-transparent p-0">
          <TabsTrigger 
            value="fixas"
            className="border border-transparent bg-white text-gray-600 rounded-md py-2 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:border-gray-200"
          >
            Despesas Fixas
          </TabsTrigger>
          <TabsTrigger 
            value="variaveis"
            className="border border-transparent bg-white text-gray-600 rounded-md py-2 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:border-gray-200"
          >
            Despesas Variáveis
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="fixas" className="space-y-4 rounded-md border border-gray-200 bg-gray-50 p-4 sm:p-6">
          <DespesasFixasTab />
        </TabsContent>
        
        <TabsContent value="variaveis" className="space-y-4 rounded-md border border-gray-200 bg-gray-50 p-4 sm:p-6">
          <DespesasVariaveisTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
