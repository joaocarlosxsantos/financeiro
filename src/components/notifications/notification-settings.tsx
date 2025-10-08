"use client";

import React, { useState, useEffect } from 'react';
import { Settings, Bell, Users, Plus, Trash2, AlertCircle, AlertTriangle, TrendingUp, Target, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';
import { AlertConfiguration, AlertConfigType } from '@/types/notifications';
import { AlertModal } from './alert-modal';

interface NotificationSettingsProps {
  className?: string;
}

export function NotificationSettings({ className }: NotificationSettingsProps) {
  const [configs, setConfigs] = useState<AlertConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedConfig, setSelectedConfig] = useState<AlertConfiguration | undefined>();

  // Fetch current configurations
  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications/alerts');
      if (response.ok) {
        const data = await response.json();
        setConfigs(data.configurations || []);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save configuration
  const saveConfig = async (config: Partial<AlertConfiguration>) => {
    try {
      setSaving(true);
      const response = await fetch('/api/notifications/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        await fetchConfigs(); // Refresh configurations
      }
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
    } finally {
      setSaving(false);
    }
  };

  // Update configuration
  const updateConfig = (type: AlertConfigType, updates: Partial<AlertConfiguration>) => {
    const config = configs.find(c => c.type === type);
    if (config) {
      const updatedConfig = { 
        ...config, 
        ...updates,
        type, // Ensure type is always present
        isEnabled: updates.isEnabled !== undefined ? updates.isEnabled : config.isEnabled
      };
      saveConfig(updatedConfig);
    } else {
      // If config doesn't exist, create a new one with minimal required fields
      const newConfig: Partial<AlertConfiguration> = {
        type,
        isEnabled: updates.isEnabled ?? true,
        categoryIds: [],
        walletIds: [],
        ...updates
      };
      saveConfig(newConfig);
    }
  };

  // Delete configuration
  const deleteConfig = async (configId: string) => {
    if (!confirm('Tem certeza que deseja excluir este alerta?')) return;
    
    try {
      setSaving(true);
      const response = await fetch(`/api/notifications/alerts/${configId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchConfigs(); // Refresh configurations
      }
    } catch (error) {
      console.error('Erro ao excluir configuração:', error);
    } finally {
      setSaving(false);
    }
  };

  // Open modal for create
  const openCreateModal = () => {
    setSelectedConfig(undefined);
    setModalMode('create');
    setModalOpen(true);
  };

  // Open modal for edit
  const openEditModal = (config: AlertConfiguration) => {
    setSelectedConfig(config);
    setModalMode('edit');
    setModalOpen(true);
  };

  // Handle modal save
  const handleModalSave = async (configData: Partial<AlertConfiguration>) => {
    await saveConfig(configData);
    setModalOpen(false);
  };

  // Get configuration by type
  const getConfig = (type: AlertConfigType): AlertConfiguration | undefined => {
    return configs.find(c => c.type === type);
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-sm text-muted-foreground mt-2">Carregando configurações...</p>
      </div>
    );
  }

  const duplicateConfig = getConfig(AlertConfigType.DUPLICATE_TRANSACTION);

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Configurações de Notificações
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Gerencie seus alertas financeiros personalizados
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="default"
            size="sm"
            onClick={openCreateModal}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Alerta
          </Button>
        </div>
      </div>

      {/* Existing Alert Configurations */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Alertas Configurados
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {configs.length > 0 
                ? `Você tem ${configs.length} alerta${configs.length > 1 ? 's' : ''} configurado${configs.length > 1 ? 's' : ''}`
                : 'Nenhum alerta configurado ainda'
              }
            </p>
          </div>
          {configs.length > 0 && (
            <Badge variant="secondary" className="text-sm">
              {configs.filter(c => c.isEnabled).length} ativo{configs.filter(c => c.isEnabled).length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        
        {configs.length === 0 ? (
          <Card className="border-dashed border-2 hover:border-blue-300 transition-colors">
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-gray-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    Nenhum alerta configurado
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm">
                    Configure alertas inteligentes para monitorar seus gastos, saldos e metas financeiras automaticamente.
                  </p>
                </div>
                <Button 
                  onClick={openCreateModal}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={saving}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Alerta
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            {configs.map((config) => {
              const typeOption = [
                { type: AlertConfigType.BUDGET_EXCEEDED, label: 'Orçamento Excedido', icon: AlertTriangle, color: 'text-red-500' },
                { type: AlertConfigType.UNUSUAL_SPENDING, label: 'Gastos Incomuns', icon: TrendingUp, color: 'text-orange-500' },
                { type: AlertConfigType.LOW_BALANCE, label: 'Saldo Baixo', icon: AlertCircle, color: 'text-yellow-500' },
                { type: AlertConfigType.GOAL_AT_RISK, label: 'Meta em Risco', icon: Target, color: 'text-blue-500' },
                { type: AlertConfigType.RECURRING_DUE, label: 'Cobrança Recorrente', icon: Calendar, color: 'text-purple-500' },
                { type: AlertConfigType.DUPLICATE_TRANSACTION, label: 'Transação Duplicada', icon: Users, color: 'text-gray-500' },
                { type: AlertConfigType.MONTHLY_SUMMARY, label: 'Resumo Mensal', icon: Settings, color: 'text-indigo-500' },
              ].find(opt => opt.type === config.type);

              if (!typeOption) {
                // Fallback para tipos desconhecidos
                return (
                  <Card key={config.id} className="hover:shadow-md transition-shadow cursor-pointer relative group">
                    <div 
                      onClick={() => openEditModal(config)}
                      className="w-full h-full absolute inset-0 z-10"
                    />
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Bell className="h-5 w-5 text-gray-500 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-base font-medium truncate">
                              {config.type} (Tipo Desconhecido)
                            </CardTitle>
                            <Badge 
                              variant={config.isEnabled ? "default" : "secondary"}
                              className="mt-1"
                            >
                              {config.isEnabled ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 relative z-20">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConfig(config.id);
                            }}
                            disabled={saving}
                            className="h-10 w-10 p-0 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground">
                        Este é um tipo de alerta não reconhecido. Clique para editar ou use o botão para excluir.
                      </p>
                    </CardContent>
                  </Card>
                );
              }

              const IconComponent = typeOption.icon;

              return (
                <Card key={config.id} className="hover:shadow-md transition-shadow cursor-pointer relative group">
                  <div 
                    onClick={() => openEditModal(config)}
                    className="w-full h-full absolute inset-0 z-10"
                  />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <IconComponent className={`h-5 w-5 ${typeOption.color} flex-shrink-0`} />
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base font-medium truncate">
                            {typeOption.label}
                          </CardTitle>
                          <Badge 
                            variant={config.isEnabled ? "default" : "secondary"}
                            className="mt-1"
                          >
                            {config.isEnabled ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 relative z-20">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConfig(config.id);
                          }}
                          disabled={saving}
                          className="h-10 w-10 p-0 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-sm">
                      {/* Informações específicas por tipo de alerta */}
                      {config.type === AlertConfigType.BUDGET_EXCEEDED && (
                        <>
                          {config.thresholdAmount && typeof config.thresholdAmount === 'number' && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Valor Limite:</span>
                              <span className="font-medium">R$ {config.thresholdAmount.toFixed(2)}</span>
                            </div>
                          )}
                          {config.thresholdPercent && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Percentual de Alerta:</span>
                              <span className="font-medium">{config.thresholdPercent}%</span>
                            </div>
                          )}
                          {config.categoryIds && config.categoryIds.length > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Categorias:</span>
                              <span className="font-medium">{config.categoryIds.length} selecionadas</span>
                            </div>
                          )}
                        </>
                      )}

                      {config.type === AlertConfigType.LOW_BALANCE && (
                        <>
                          {config.thresholdAmount && typeof config.thresholdAmount === 'number' && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Saldo Mínimo:</span>
                              <span className="font-medium">R$ {config.thresholdAmount.toFixed(2)}</span>
                            </div>
                          )}
                          {config.walletIds && config.walletIds.length > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Carteiras:</span>
                              <span className="font-medium">{config.walletIds.length} selecionadas</span>
                            </div>
                          )}
                        </>
                      )}

                      {config.type === AlertConfigType.UNUSUAL_SPENDING && (
                        <>
                          {config.thresholdAmount && typeof config.thresholdAmount === 'number' && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Valor Mínimo:</span>
                              <span className="font-medium">R$ {config.thresholdAmount.toFixed(2)}</span>
                            </div>
                          )}
                          {config.settings?.unusualSpendingSettings?.percentageThreshold && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">% Acima da Média:</span>
                              <span className="font-medium">{config.settings.unusualSpendingSettings.percentageThreshold}%</span>
                            </div>
                          )}
                          {config.categoryIds && config.categoryIds.length > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Categorias:</span>
                              <span className="font-medium">{config.categoryIds.length} selecionadas</span>
                            </div>
                          )}
                          {config.walletIds && config.walletIds.length > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Carteiras:</span>
                              <span className="font-medium">{config.walletIds.length} selecionadas</span>
                            </div>
                          )}
                        </>
                      )}

                      {config.type === AlertConfigType.GOAL_AT_RISK && (
                        <>
                          {config.settings?.goalSettings?.goalIds && config.settings.goalSettings.goalIds.length > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Metas:</span>
                              <span className="font-medium">
                                {config.settings.goalSettings.goalIds.length === 1 
                                  ? "1 meta selecionada"
                                  : `${config.settings.goalSettings.goalIds.length} metas selecionadas`
                                }
                              </span>
                            </div>
                          )}
                          {config.settings?.goalSettings?.daysBeforeDeadline && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Dias de Antecedência:</span>
                              <span className="font-medium">{config.settings.goalSettings.daysBeforeDeadline} dias</span>
                            </div>
                          )}
                          {config.settings?.goalSettings?.percentageThreshold && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">% Mínimo Concluído:</span>
                              <span className="font-medium">{config.settings.goalSettings.percentageThreshold}%</span>
                            </div>
                          )}
                        </>
                      )}

                      {config.type === AlertConfigType.RECURRING_DUE && (
                        <>
                          {config.settings?.recurringSettings?.daysBefore && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Alertar em:</span>
                              <span className="font-medium">{config.settings.recurringSettings.daysBefore.join(', ')} dias antes</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Incluir Vencidas:</span>
                            <span className="font-medium">
                              {config.settings?.recurringSettings?.includeOverdue ? 'Sim' : 'Não'}
                            </span>
                          </div>
                        </>
                      )}

                      {config.type === AlertConfigType.DUPLICATE_TRANSACTION && (
                        <>
                          {config.categoryIds && config.categoryIds.length > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Categorias:</span>
                              <span className="font-medium">{config.categoryIds.length} selecionadas</span>
                            </div>
                          )}
                          {config.walletIds && config.walletIds.length > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Carteiras:</span>
                              <span className="font-medium">{config.walletIds.length} selecionadas</span>
                            </div>
                          )}
                        </>
                      )}

                      {/* Se não há configurações específicas, mostrar mensagem genérica */}
                      {!config.thresholdAmount && 
                       !config.thresholdPercent && 
                       (!config.categoryIds || config.categoryIds.length === 0) && 
                       (!config.walletIds || config.walletIds.length === 0) && 
                       !config.settings && (
                        <div className="text-center py-2">
                          <span className="text-muted-foreground text-sm">Configuração padrão aplicada</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>





      {/* Status */}
      {saving && (
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            Salvando configurações...
          </div>
        </div>
      )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleModalSave}
        alertConfig={selectedConfig}
        mode={modalMode}
      />
    </div>
  );
}