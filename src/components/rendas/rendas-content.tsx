'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { RendasFixasTab } from './rendas-fixas-tab'
import { RendasVariaveisTab } from './rendas-variaveis-tab'

export function RendasContent() {
  const [activeTab, setActiveTab] = useState('fixas')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rendas</h1>
          <p className="text-gray-600">Gerencie suas rendas fixas e variáveis</p>
        </div>
        
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Renda
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fixas">Rendas Fixas</TabsTrigger>
          <TabsTrigger value="variaveis">Rendas Variáveis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="fixas" className="space-y-4">
          <RendasFixasTab />
        </TabsContent>
        
        <TabsContent value="variaveis" className="space-y-4">
          <RendasVariaveisTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
