'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScenarioParameters } from '@/lib/scenario-simulator';
import { Plus } from 'lucide-react';

interface ScenarioFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (scenario: Omit<ScenarioParameters, 'id'>) => void;
  initialData?: Partial<ScenarioParameters>;
}

const COLORS = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', 
  '#06B6D4', '#EC4899', '#14B8A6', '#F97316', '#6366F1'
];

export function ScenarioForm({ 
  open, 
  onOpenChange, 
  onSubmit,
  initialData 
}: ScenarioFormProps) {
  const [formData, setFormData] = useState<Partial<ScenarioParameters>>({
    name: '',
    description: '',
    duration: 12,
    initialBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    monthlySavings: 0,
    color: COLORS[0],
    ...initialData,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData as Omit<ScenarioParameters, 'id'>);
    onOpenChange(false);
    
    // Reset form
    setFormData({
      name: '',
      description: '',
      duration: 12,
      initialBalance: 0,
      monthlyIncome: 0,
      monthlyExpenses: 0,
      monthlySavings: 0,
      color: COLORS[0],
    });
    setShowAdvanced(false);
  };

  const updateField = (field: keyof ScenarioParameters, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Cenário Financeiro</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Informações Básicas */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="name">Nome do Cenário *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Ex: Cenário Conservador"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <textarea
                id="description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField('description', e.target.value)}
                placeholder="Descreva as características deste cenário..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="duration">Duração (meses) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min={1}
                  max={360}
                  value={formData.duration}
                  onChange={(e) => updateField('duration', Number(e.target.value))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="color">Cor</Label>
                <div className="flex gap-2 mt-1">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className="w-8 h-8 rounded-full border-2 hover:scale-110 transition-transform"
                      style={{
                        backgroundColor: color,
                        borderColor: formData.color === color ? '#000' : 'transparent',
                      }}
                      onClick={() => updateField('color', color)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Valores Base */}
          <div className="space-y-3 pt-3 border-t">
            <h4 className="font-semibold text-sm">Valores Base</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="initialBalance">Saldo Inicial *</Label>
                <Input
                  id="initialBalance"
                  type="number"
                  step="0.01"
                  value={formData.initialBalance}
                  onChange={(e) => updateField('initialBalance', Number(e.target.value))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="monthlyIncome">Renda Mensal *</Label>
                <Input
                  id="monthlyIncome"
                  type="number"
                  step="0.01"
                  value={formData.monthlyIncome}
                  onChange={(e) => updateField('monthlyIncome', Number(e.target.value))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="monthlyExpenses">Despesas Mensais *</Label>
                <Input
                  id="monthlyExpenses"
                  type="number"
                  step="0.01"
                  value={formData.monthlyExpenses}
                  onChange={(e) => updateField('monthlyExpenses', Number(e.target.value))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="monthlySavings">Economia Mensal *</Label>
                <Input
                  id="monthlySavings"
                  type="number"
                  step="0.01"
                  value={formData.monthlySavings}
                  onChange={(e) => updateField('monthlySavings', Number(e.target.value))}
                  required
                />
              </div>
            </div>
          </div>

          {/* Mudanças Propostas */}
          <div className="space-y-3 pt-3 border-t">
            <h4 className="font-semibold text-sm">Mudanças Propostas (opcional)</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="incomeChange">Mudança na Renda (%)</Label>
                <Input
                  id="incomeChange"
                  type="number"
                  step="0.1"
                  value={formData.incomeChange || ''}
                  onChange={(e) => updateField('incomeChange', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Ex: +20 ou -10"
                />
              </div>

              <div>
                <Label htmlFor="expensesChange">Mudança nas Despesas (%)</Label>
                <Input
                  id="expensesChange"
                  type="number"
                  step="0.1"
                  value={formData.expensesChange || ''}
                  onChange={(e) => updateField('expensesChange', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Ex: +15 ou -20"
                />
              </div>

              <div>
                <Label htmlFor="savingsChange">Mudança na Economia (R$)</Label>
                <Input
                  id="savingsChange"
                  type="number"
                  step="0.01"
                  value={formData.savingsChange || ''}
                  onChange={(e) => updateField('savingsChange', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Ex: +500"
                />
              </div>
            </div>
          </div>

          {/* Opções Avançadas */}
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between mb-3">
              <Label>Opções Avançadas</Label>
              <Switch
                checked={showAdvanced}
                onCheckedChange={setShowAdvanced}
              />
            </div>

            {showAdvanced && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="oneTimeExpense">Gasto Único (R$)</Label>
                    <Input
                      id="oneTimeExpense"
                      type="number"
                      step="0.01"
                      value={formData.oneTimeExpense || ''}
                      onChange={(e) => updateField('oneTimeExpense', e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="oneTimeExpenseMonth">No Mês</Label>
                    <Input
                      id="oneTimeExpenseMonth"
                      type="number"
                      min={1}
                      value={formData.oneTimeExpenseMonth || ''}
                      onChange={(e) => updateField('oneTimeExpenseMonth', e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="oneTimeIncome">Renda Extra Única (R$)</Label>
                    <Input
                      id="oneTimeIncome"
                      type="number"
                      step="0.01"
                      value={formData.oneTimeIncome || ''}
                      onChange={(e) => updateField('oneTimeIncome', e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="oneTimeIncomeMonth">No Mês</Label>
                    <Input
                      id="oneTimeIncomeMonth"
                      type="number"
                      min={1}
                      value={formData.oneTimeIncomeMonth || ''}
                      onChange={(e) => updateField('oneTimeIncomeMonth', e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="inflation">Inflação Mensal (%)</Label>
                    <Input
                      id="inflation"
                      type="number"
                      step="0.01"
                      value={formData.inflation || ''}
                      onChange={(e) => updateField('inflation', e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="Ex: 0.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="investmentReturn">Retorno de Investimento (%)</Label>
                    <Input
                      id="investmentReturn"
                      type="number"
                      step="0.01"
                      value={formData.investmentReturn || ''}
                      onChange={(e) => updateField('investmentReturn', e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="Ex: 1.0"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              <Plus className="h-4 w-4 mr-2" />
              Criar Cenário
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
