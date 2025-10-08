"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select } from '@/components/ui/select';
import MultiSelect from '@/components/ui/multi-select';
import { AlertConfiguration, AlertConfigType } from '@/types/notifications';
import { AlertTriangle, TrendingUp, AlertCircle, Target, Calendar, Users } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: Partial<AlertConfiguration>) => Promise<void>;
  alertConfig?: AlertConfiguration;
  mode: 'create' | 'edit';
}

const ALERT_TYPE_OPTIONS = [
  { 
    value: AlertConfigType.BUDGET_EXCEEDED, 
    label: 'Orçamento Excedido', 
    icon: AlertTriangle,
    description: 'Alerta quando gastos ultrapassam o limite do orçamento'
  },
  { 
    value: AlertConfigType.UNUSUAL_SPENDING, 
    label: 'Gastos Incomuns', 
    icon: TrendingUp,
    description: 'Alerta para gastos fora do padrão normal'
  },
  { 
    value: AlertConfigType.LOW_BALANCE, 
    label: 'Saldo Baixo', 
    icon: AlertCircle,
    description: 'Alerta quando o saldo da carteira fica baixo'
  },
  { 
    value: AlertConfigType.GOAL_AT_RISK, 
    label: 'Meta em Risco', 
    icon: Target,
    description: 'Alerta quando uma meta de poupança está em risco'
  },
  { 
    value: AlertConfigType.RECURRING_DUE, 
    label: 'Cobrança Recorrente', 
    icon: Calendar,
    description: 'Lembrete de transações recorrentes que vencem'
  },
  { 
    value: AlertConfigType.DUPLICATE_TRANSACTION, 
    label: 'Transação Duplicada', 
    icon: Users,
    description: 'Detecta possíveis transações duplicadas'
  }
];

export function AlertModal({ isOpen, onClose, onSave, alertConfig, mode }: AlertModalProps) {
  const [formData, setFormData] = useState<Partial<AlertConfiguration>>({
    type: AlertConfigType.BUDGET_EXCEEDED,
    isEnabled: true,
    settings: {},
    categoryIds: [],
    walletIds: []
  });
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Carregar dados quando o modal abre
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (alertConfig && mode === 'edit') {
      setFormData({
        ...alertConfig,
        categoryIds: alertConfig.categoryIds || [],
        walletIds: alertConfig.walletIds || [],
        settings: alertConfig.settings || {}
      });
    } else if (mode === 'create') {
      setFormData({
        type: AlertConfigType.BUDGET_EXCEEDED,
        isEnabled: true,
        settings: {},
        categoryIds: [],
        walletIds: []
      });
    }
  }, [alertConfig, mode, isOpen]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [categoriesRes, walletsRes, goalsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/wallets'),
        fetch('/api/goals')
      ]);

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }

      if (walletsRes.ok) {
        const walletsData = await walletsRes.json();
        setWallets(walletsData);
      }

      if (goalsRes.ok) {
        const goalsData = await goalsRes.json();
        setGoals(goalsData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Limpar campos nulos/undefined antes do envio
      const cleanedData = { ...formData };
      
      // Remover thresholdAmount se for 0, null ou undefined
      if (!cleanedData.thresholdAmount || cleanedData.thresholdAmount <= 0) {
        delete cleanedData.thresholdAmount;
      }
      
      // Remover thresholdPercent se for 0, null ou undefined
      if (!cleanedData.thresholdPercent || cleanedData.thresholdPercent <= 0) {
        delete cleanedData.thresholdPercent;
      }
      
      // Remover arrays vazios
      if (cleanedData.categoryIds && cleanedData.categoryIds.length === 0) {
        delete cleanedData.categoryIds;
      }
      
      if (cleanedData.walletIds && cleanedData.walletIds.length === 0) {
        delete cleanedData.walletIds;
      }
      
      await onSave(cleanedData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar alerta:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: value
      }
    }));
  };

  const selectedType = ALERT_TYPE_OPTIONS.find(option => option.value === formData.type);

  return (
    <Modal 
      open={isOpen} 
      onClose={onClose}
      title={mode === 'create' ? 'Criar Novo Alerta' : 'Editar Alerta'}
      size="lg"
    >

      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        {/* Tipo de Alerta */}
        {mode === 'create' && (
          <div>
            <Label htmlFor="alert-type">Tipo de Alerta</Label>
            <Select
              id="alert-type"
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as AlertConfigType }))}
            >
              <option value="">Selecione o tipo</option>
              {ALERT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            {selectedType && (
              <p className="text-xs text-muted-foreground mt-1">
                {selectedType.description}
              </p>
            )}
          </div>
        )}

        {/* Status do Alerta */}
        <div className="flex items-center justify-between">
          <Label htmlFor="enabled">Alerta Ativo</Label>
          <Switch
            id="enabled"
            checked={formData.isEnabled}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isEnabled: checked }))}
          />
        </div>

        {/* Campos específicos por tipo de alerta */}
        
        {/* ORÇAMENTO EXCEDIDO */}
        {formData.type === AlertConfigType.BUDGET_EXCEEDED && (
          <>
            <div>
              <Label htmlFor="categories">Categorias</Label>
              {loadingData ? (
                <div className="text-sm text-muted-foreground">Carregando categorias...</div>
              ) : (
                <MultiSelect
                  items={categories.map(cat => ({ id: cat.id, name: cat.name }))}
                  value={formData.categoryIds || []}
                  onChange={(selectedIds) => setFormData(prev => ({ ...prev, categoryIds: selectedIds }))}
                  placeholder="Selecione as categorias"
                />
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Deixe vazio para aplicar a todas as categorias
              </p>
            </div>

            <div>
              <Label htmlFor="threshold-amount">Valor Limite (R$)</Label>
              <Input
                id="threshold-amount"
                type="number"
                step="0.01"
                placeholder="1000.00"
                value={formData.thresholdAmount || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData(prev => ({ 
                    ...prev, 
                    thresholdAmount: value ? parseFloat(value) : undefined
                  }));
                }}
              />
            </div>

            <div>
              <Label htmlFor="threshold-percent">Percentual de Alerta (%)</Label>
              <Input
                id="threshold-percent"
                type="number"
                placeholder="80"
                min="1"
                max="100"
                value={formData.thresholdPercent || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData(prev => ({ 
                    ...prev, 
                    thresholdPercent: value ? parseInt(value) : undefined
                  }));
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Será alertado quando atingir este percentual do limite
              </p>
            </div>
          </>
        )}

        {/* SALDO BAIXO */}
        {formData.type === AlertConfigType.LOW_BALANCE && (
          <>
            <div>
              <Label htmlFor="wallets">Carteiras</Label>
              {loadingData ? (
                <div className="text-sm text-muted-foreground">Carregando carteiras...</div>
              ) : (
                <MultiSelect
                  items={wallets.map(wallet => ({ id: wallet.id, name: wallet.name }))}
                  value={formData.walletIds || []}
                  onChange={(selectedIds) => setFormData(prev => ({ ...prev, walletIds: selectedIds }))}
                  placeholder="Selecione as carteiras"
                />
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Deixe vazio para aplicar a todas as carteiras
              </p>
            </div>

            <div>
              <Label htmlFor="threshold-amount">Saldo Mínimo (R$)</Label>
              <Input
                id="threshold-amount"
                type="number"
                step="0.01"
                placeholder="100.00"
                value={formData.thresholdAmount || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData(prev => ({ 
                    ...prev, 
                    thresholdAmount: value ? parseFloat(value) : undefined
                  }));
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Alertar quando o saldo ficar abaixo deste valor
              </p>
            </div>
          </>
        )}

        {/* GASTOS INCOMUNS */}
        {formData.type === AlertConfigType.UNUSUAL_SPENDING && (
          <>
            <div>
              <Label htmlFor="categories">Categorias</Label>
              {loadingData ? (
                <div className="text-sm text-muted-foreground">Carregando categorias...</div>
              ) : (
                <MultiSelect
                  items={categories.map(cat => ({ id: cat.id, name: cat.name }))}
                  value={formData.categoryIds || []}
                  onChange={(selectedIds) => setFormData(prev => ({ ...prev, categoryIds: selectedIds }))}
                  placeholder="Selecione as categorias"
                />
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Deixe vazio para aplicar a todas as categorias
              </p>
            </div>

            <div>
              <Label htmlFor="wallets">Carteiras</Label>
              {loadingData ? (
                <div className="text-sm text-muted-foreground">Carregando carteiras...</div>
              ) : (
                <MultiSelect
                  items={wallets.map(wallet => ({ id: wallet.id, name: wallet.name }))}
                  value={formData.walletIds || []}
                  onChange={(selectedIds) => setFormData(prev => ({ ...prev, walletIds: selectedIds }))}
                  placeholder="Selecione as carteiras"
                />
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Deixe vazio para aplicar a todas as carteiras
              </p>
            </div>

            <div>
              <Label htmlFor="threshold-amount">Valor Mínimo (R$)</Label>
              <Input
                id="threshold-amount"
                type="number"
                step="0.01"
                placeholder="500.00"
                value={formData.thresholdAmount || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData(prev => ({ 
                    ...prev, 
                    thresholdAmount: value ? parseFloat(value) : undefined
                  }));
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Valor mínimo para considerar um gasto como relevante
              </p>
            </div>

            <div>
              <Label htmlFor="spending-threshold">Percentual acima da média (%)</Label>
              <Input
                id="spending-threshold"
                type="number"
                placeholder="50"
                min="1"
                value={formData.settings?.unusualSpendingSettings?.percentageThreshold || ''}
                onChange={(e) => updateSettings('unusualSpendingSettings', { 
                  ...formData.settings?.unusualSpendingSettings,
                  percentageThreshold: parseInt(e.target.value) || 50 
                })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Alertar quando o gasto for X% maior que a média
              </p>
            </div>
          </>
        )}

        {/* META EM RISCO */}
        {formData.type === AlertConfigType.GOAL_AT_RISK && (
          <>
            <div>
              <Label htmlFor="goals">Metas a Monitorar</Label>
              {loadingData ? (
                <div className="text-sm text-muted-foreground">Carregando metas...</div>
              ) : (
                <MultiSelect
                  items={goals.map(goal => ({ 
                    id: goal.id, 
                    name: goal.title || `Meta ${goal.kind} - R$ ${goal.amount}` 
                  }))}
                  value={formData.settings?.goalSettings?.goalIds || []}
                  onChange={(selectedIds) => updateSettings('goalSettings', {
                    ...formData.settings?.goalSettings,
                    goalIds: selectedIds
                  })}
                  placeholder="Selecione as metas"
                />
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Deixe vazio para monitorar todas as metas
              </p>
            </div>

            <div>
              <Label htmlFor="goal-days">Dias antes do vencimento</Label>
              <Input
                id="goal-days"
                type="number"
                placeholder="30"
                min="1"
                value={formData.settings?.goalSettings?.daysBeforeDeadline || ''}
                onChange={(e) => updateSettings('goalSettings', { 
                  ...formData.settings?.goalSettings,
                  daysBeforeDeadline: parseInt(e.target.value) || 30 
                })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Alertar X dias antes da meta vencer
              </p>
            </div>

            <div>
              <Label htmlFor="goal-threshold">Percentual mínimo concluído (%)</Label>
              <Input
                id="goal-threshold"
                type="number"
                placeholder="70"
                min="1"
                max="100"
                value={formData.settings?.goalSettings?.percentageThreshold || ''}
                onChange={(e) => updateSettings('goalSettings', { 
                  ...formData.settings?.goalSettings,
                  percentageThreshold: parseInt(e.target.value) || 70 
                })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Alertar se menos de X% da meta foi cumprida
              </p>
            </div>
          </>
        )}

        {/* COBRANÇA RECORRENTE */}
        {formData.type === AlertConfigType.RECURRING_DUE && (
          <>
            <div>
              <Label htmlFor="recurring-days">Dias de Antecedência</Label>
              <Input
                id="recurring-days"
                placeholder="1,3,7"
                value={formData.settings?.recurringSettings?.daysBefore?.join(',') || ''}
                onChange={(e) => {
                  const values = e.target.value.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
                  updateSettings('recurringSettings', { 
                    ...formData.settings?.recurringSettings,
                    daysBefore: values 
                  });
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ex: 1,3,7 para alertar 1, 3 e 7 dias antes
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="recurring-overdue">Incluir Vencidas</Label>
              <Switch
                id="recurring-overdue"
                checked={formData.settings?.recurringSettings?.includeOverdue ?? true}
                onCheckedChange={(checked) => updateSettings('recurringSettings', {
                  ...formData.settings?.recurringSettings,
                  includeOverdue: checked
                })}
              />
            </div>
          </>
        )}

        {/* TRANSAÇÃO DUPLICADA */}
        {formData.type === AlertConfigType.DUPLICATE_TRANSACTION && (
          <>
            <div>
              <Label htmlFor="categories">Categorias</Label>
              {loadingData ? (
                <div className="text-sm text-muted-foreground">Carregando categorias...</div>
              ) : (
                <MultiSelect
                  items={categories.map(cat => ({ id: cat.id, name: cat.name }))}
                  value={formData.categoryIds || []}
                  onChange={(selectedIds) => setFormData(prev => ({ ...prev, categoryIds: selectedIds }))}
                  placeholder="Selecione as categorias"
                />
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Deixe vazio para aplicar a todas as categorias
              </p>
            </div>

            <div>
              <Label htmlFor="wallets">Carteiras</Label>
              {loadingData ? (
                <div className="text-sm text-muted-foreground">Carregando carteiras...</div>
              ) : (
                <MultiSelect
                  items={wallets.map(wallet => ({ id: wallet.id, name: wallet.name }))}
                  value={formData.walletIds || []}
                  onChange={(selectedIds) => setFormData(prev => ({ ...prev, walletIds: selectedIds }))}
                  placeholder="Selecione as carteiras"
                />
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Deixe vazio para aplicar a todas as carteiras
              </p>
            </div>
          </>
        )}

        {/* RESUMO MENSAL */}
        {formData.type === AlertConfigType.MONTHLY_SUMMARY && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Este alerta enviará um resumo mensal automático de suas finanças.
              Não há configurações adicionais necessárias.
            </p>
          </div>
        )}
        <div className="flex gap-3 mt-6 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={loading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading || !formData.type}
            className="flex-1"
          >
            {loading ? 'Salvando...' : (mode === 'create' ? 'Criar Alerta' : 'Salvar Alterações')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}