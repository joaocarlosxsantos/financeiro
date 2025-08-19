
'use client'

import { useState } from 'react'
import { useMonth } from '@/components/providers/month-provider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DespesasFixasTab } from './despesas-fixas-tab'
import DespesasVariaveisTab from './despesas-variaveis-tab'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

export default function DespesasContent() {
  const [activeTab, setActiveTab] = useState('fixas')
  const { currentDate, setCurrentDate } = useMonth();

  // Navegação de mês global
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    const now = new Date();
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    if (nextMonth <= now) {
      setCurrentDate(nextMonth);
    }
  };
  const monthLabel = currentDate.toLocaleString('pt-BR', { month: 'long' });
  const monthLabelCapitalized = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  const yearLabel = currentDate.getFullYear();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Saídas</h1>
          <p className="text-gray-600 dark:text-foreground">Gerencie suas saídas fixas e variáveis</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevMonth} aria-label="Mês anterior">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center px-2 py-1 border rounded bg-background text-foreground">
            <Calendar className="w-4 h-4 mr-1" />
            {monthLabelCapitalized} {yearLabel}
          </div>
          <Button variant="outline" size="sm" onClick={handleNextMonth} aria-label="Próximo mês">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 gap-2 bg-transparent p-0">
          <TabsTrigger 
            value="fixas"
            className="border border-border bg-background text-white rounded-md py-2 data-[state=active]:bg-background data-[state=active]:text-white data-[state=active]:border-primary"
          >
            Saídas Fixas
          </TabsTrigger>
          <TabsTrigger 
            value="variaveis"
            className="border border-border bg-background text-white rounded-md py-2 data-[state=active]:bg-background data-[state=active]:text-white data-[state=active]:border-primary"
          >
            Saídas Variáveis
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="fixas" className="space-y-4 rounded-md border border-border bg-background p-4 sm:p-6">
          <DespesasFixasTab currentDate={currentDate} />
        </TabsContent>
        
        <TabsContent value="variaveis" className="space-y-4 rounded-md border border-border bg-background p-4 sm:p-6">
          <DespesasVariaveisTab currentDate={currentDate} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
