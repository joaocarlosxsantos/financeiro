'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toast } from '@/components/ui/toast';
import { 
  Plus, 
  Play, 
  Sparkles, 
  TrendingUp,
  LineChart as LineChartIcon,
  Save
} from 'lucide-react';
import { ScenarioForm } from '@/components/scenarios/scenario-form';
import { ScenarioCard } from '@/components/scenarios/scenario-card';
import { ScenarioChart } from '@/components/scenarios/scenario-chart';
import { ScenarioComparison } from '@/components/scenarios/scenario-comparison';
import { 
  ScenarioParameters, 
  ScenarioResult,
  getScenarioTemplates 
} from '@/lib/scenario-simulator';

export default function SimuladorPage() {
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [scenarios, setScenarios] = useState<(ScenarioParameters & { id: string })[]>([]);
  const [results, setResults] = useState<ScenarioResult[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState<any[]>([]);
  
  // Dados do dashboard (valores atuais do usuário)
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
    fetchSavedScenarios();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard-summary');
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchSavedScenarios = async () => {
    try {
      const response = await fetch('/api/scenarios');
      if (response.ok) {
        const data = await response.json();
        setSavedScenarios(data.scenarios || []);
      }
    } catch (error) {
      console.error('Error fetching scenarios:', error);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastOpen(true);
  };

  const handleAddScenario = (scenario: Omit<ScenarioParameters, 'id'>) => {
    const newScenario = {
      ...scenario,
      id: `scenario-${Date.now()}`,
    };
    
    setScenarios(prev => [...prev, newScenario]);
    
    showToast(`${scenario.name} foi adicionado à simulação`);
  };

  const handleUseTemplate = (template: Partial<ScenarioParameters>) => {
    if (!dashboardData) {
      showToast('Carregando informações do dashboard...');
      return;
    }

    const currentBalance = parseFloat(dashboardData.currentBalance) || 0;
    const monthlyIncome = parseFloat(dashboardData.currentMonthIncome) || 0;
    const monthlyExpenses = parseFloat(dashboardData.currentMonthExpenses) || 0;
    const monthlySavings = monthlyIncome - monthlyExpenses;

    const newScenario: ScenarioParameters & { id: string } = {
      id: `template-${Date.now()}`,
      duration: 12,
      initialBalance: currentBalance,
      monthlyIncome,
      monthlyExpenses,
      monthlySavings,
      ...template,
    } as ScenarioParameters & { id: string };

    setScenarios(prev => [...prev, newScenario]);
    
    showToast(`${template.name} foi adicionado à simulação`);
  };

  const handleRemoveScenario = (id: string) => {
    setScenarios(prev => prev.filter(s => s.id !== id));
    setResults(prev => prev.filter(r => r.id !== id));
  };

  const handleSimulate = async () => {
    if (scenarios.length === 0) {
      showToast('Adicione pelo menos um cenário para simular');
      return;
    }

    setIsSimulating(true);
    
    try {
      const response = await fetch('/api/scenarios/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarios }),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.results);
        
        showToast(`${data.results.length} cenário(s) simulado(s) com sucesso`);
      } else {
        throw new Error('Erro na simulação');
      }
    } catch (error) {
      console.error('Error simulating:', error);
      showToast('Não foi possível simular os cenários');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSaveScenario = async (scenario: ScenarioParameters & { id: string }) => {
    try {
      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario),
      });

      if (response.ok) {
        showToast('O cenário foi salvo com sucesso');
        fetchSavedScenarios();
      } else {
        throw new Error('Erro ao salvar');
      }
    } catch (error) {
      console.error('Error saving scenario:', error);
      showToast('Não foi possível salvar o cenário');
    }
  };

  const templates = dashboardData 
    ? getScenarioTemplates(
        parseFloat(dashboardData.currentBalance) || 0,
        parseFloat(dashboardData.currentMonthIncome) || 0,
        parseFloat(dashboardData.currentMonthExpenses) || 0
      )
    : [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <LineChartIcon className="h-8 w-8 text-primary" />
          Simulador de Cenários Financeiros
        </h1>
        <p className="text-muted-foreground mt-2">
          Compare diferentes cenários "E se...?" e veja o impacto nas suas finanças
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cenário
        </Button>
        
        <Button 
          onClick={handleSimulate} 
          disabled={scenarios.length === 0 || isSimulating}
          variant="default"
        >
          <Play className="h-4 w-4 mr-2" />
          {isSimulating ? 'Simulando...' : 'Simular Cenários'}
        </Button>
      </div>

      <Tabs defaultValue="builder" className="space-y-4">
        <TabsList>
          <TabsTrigger value="builder">
            <Plus className="h-4 w-4 mr-2" />
            Construir
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Sparkles className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="results" disabled={results.length === 0}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Resultados
          </TabsTrigger>
        </TabsList>

        {/* Tab: Construir */}
        <TabsContent value="builder" className="space-y-4">
          {scenarios.length === 0 ? (
            <Card className="p-12 text-center">
              <LineChartIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum cenário adicionado</h3>
              <p className="text-muted-foreground mb-4">
                Crie seu primeiro cenário ou use um template pronto
              </p>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Cenário
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {scenarios.map(scenario => (
                <div key={scenario.id} className="flex gap-3">
                  <div className="flex-1">
                    <ScenarioCard
                      scenario={scenario}
                      onDelete={() => handleRemoveScenario(scenario.id)}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSaveScenario(scenario)}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Templates */}
        <TabsContent value="templates" className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Templates Prontos</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Use seus dados atuais como base para cenários pré-configurados
            </p>
            
            {!dashboardData ? (
              <p className="text-center text-muted-foreground py-8">
                Carregando seus dados...
              </p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {templates.map((template, index) => (
                  <Card 
                    key={index} 
                    className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                    style={{ borderLeft: `4px solid ${template.color}` }}
                    onClick={() => handleUseTemplate(template)}
                  >
                    <h4 className="font-semibold mb-2">{template.name}</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      {template.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 text-xs">
                      {template.incomeChange !== undefined && template.incomeChange !== 0 && (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded">
                          Renda: {template.incomeChange > 0 ? '+' : ''}{template.incomeChange}%
                        </span>
                      )}
                      {template.expensesChange !== undefined && template.expensesChange !== 0 && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded">
                          Despesas: {template.expensesChange}%
                        </span>
                      )}
                      {template.investmentReturn && (
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded">
                          Retorno: {template.investmentReturn}%
                        </span>
                      )}
                    </div>
                    
                    <Button size="sm" className="w-full mt-3">
                      Usar Template
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Tab: Resultados */}
        <TabsContent value="results" className="space-y-4">
          {results.length > 0 && (
            <>
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Projeção de Saldo</h3>
                <ScenarioChart results={results} dataKey="balance" />
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-4">Renda vs Despesas</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Renda Mensal</h4>
                    <ScenarioChart results={results} dataKey="income" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Despesas Mensais</h4>
                    <ScenarioChart results={results} dataKey="expenses" />
                  </div>
                </div>
              </Card>

              <ScenarioComparison results={results} />
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      {/* Form Dialog */}
      <ScenarioForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleAddScenario}
      />

      {/* Toast */}
      <Toast
        open={toastOpen}
        message={toastMessage}
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
}
