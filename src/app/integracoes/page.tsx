'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toast } from '@/components/ui/toast';
import { 
  Plus, 
  Trash2, 
  MessageSquare, 
  Send, 
  Link as LinkIcon,
  Shield,
  CheckCircle2,
  XCircle,
  Zap
} from 'lucide-react';

interface Webhook {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  events: string[];
  lastTriggered?: string;
  successCount: number;
  failureCount: number;
}

interface Integration {
  id: string;
  platform: string;
  chatId?: string;
  isActive: boolean;
  enabledCommands: string[];
  notifyTransactions: boolean;
  notifyGoals: boolean;
  notifyAlerts: boolean;
  lastUsed?: string;
  usageCount: number;
}

export default function IntegrationPage() {
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [showIntegrationForm, setShowIntegrationForm] = useState(false);

  useEffect(() => {
    fetchWebhooks();
    fetchIntegrations();
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastOpen(true);
  };

  const fetchWebhooks = async () => {
    try {
      const response = await fetch('/api/webhooks');
      if (response.ok) {
        const data = await response.json();
        setWebhooks(data.webhooks);
      }
    } catch (error) {
      console.error('Error fetching webhooks:', error);
    }
  };

  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/integrations');
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data.integrations);
      }
    } catch (error) {
      console.error('Error fetching integrations:', error);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showToast('Webhook removido com sucesso');
        fetchWebhooks();
      }
    } catch (error) {
      console.error('Error deleting webhook:', error);
      showToast('Erro ao remover webhook');
    }
  };

  const handleToggleWebhook = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        showToast(`Webhook ${!isActive ? 'ativado' : 'desativado'}`);
        fetchWebhooks();
      }
    } catch (error) {
      console.error('Error toggling webhook:', error);
      showToast('Erro ao atualizar webhook');
    }
  };

  const handleDeleteIntegration = async (id: string) => {
    try {
      const response = await fetch(`/api/integrations/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showToast('Integração removida com sucesso');
        fetchIntegrations();
      }
    } catch (error) {
      console.error('Error deleting integration:', error);
      showToast('Erro ao remover integração');
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Zap className="h-8 w-8 text-primary" />
          Webhooks & Integrações
        </h1>
        <p className="text-muted-foreground mt-2">
          Conecte seu aplicativo com serviços externos e receba notificações
        </p>
      </div>

      <Tabs defaultValue="webhooks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="webhooks">
            <LinkIcon className="h-4 w-4 mr-2" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <MessageSquare className="h-4 w-4 mr-2" />
            Integrações
          </TabsTrigger>
        </TabsList>

        {/* Tab: Webhooks */}
        <TabsContent value="webhooks" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Seus Webhooks</h3>
                <p className="text-sm text-muted-foreground">
                  Receba notificações em tempo real quando eventos ocorrem
                </p>
              </div>
              <Button onClick={() => setShowWebhookForm(!showWebhookForm)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Webhook
              </Button>
            </div>

            {webhooks.length === 0 ? (
              <div className="text-center py-12">
                <LinkIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum webhook configurado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {webhooks.map(webhook => (
                  <Card key={webhook.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">{webhook.name}</h4>
                          {webhook.isActive ? (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded text-xs">
                              Ativo
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs">
                              Inativo
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {webhook.url}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            {webhook.successCount} sucessos
                          </span>
                          <span className="flex items-center gap-1">
                            <XCircle className="h-3 w-3 text-red-600" />
                            {webhook.failureCount} falhas
                          </span>
                          {webhook.lastTriggered && (
                            <span>
                              Último: {new Date(webhook.lastTriggered).toLocaleString('pt-BR')}
                            </span>
                          )}
                        </div>
                        
                        <div className="mt-2 flex flex-wrap gap-1">
                          {webhook.events.map(event => (
                            <span 
                              key={event}
                              className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-xs"
                            >
                              {event}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Switch
                          checked={webhook.isActive}
                          onCheckedChange={() => handleToggleWebhook(webhook.id, webhook.isActive)}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteWebhook(webhook.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>

          {/* Eventos Disponíveis */}
          <Card className="p-6">
            <h3 className="font-semibold mb-3">Eventos Disponíveis</h3>
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div>
                <h4 className="font-medium mb-2">Transações</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• transaction.created</li>
                  <li>• transaction.updated</li>
                  <li>• transaction.deleted</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Metas</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• goal.created</li>
                  <li>• goal.achieved</li>
                  <li>• goal.failed</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Alertas</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• alert.triggered</li>
                  <li>• budget.exceeded</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Conquistas</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• achievement.unlocked</li>
                  <li>• challenge.completed</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab: Integrações */}
        <TabsContent value="integrations" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Suas Integrações</h3>
                <p className="text-sm text-muted-foreground">
                  Conecte com Telegram, WhatsApp e outros serviços
                </p>
              </div>
              <Button onClick={() => setShowIntegrationForm(!showIntegrationForm)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Integração
              </Button>
            </div>

            {integrations.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma integração configurada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {integrations.map(integration => (
                  <Card key={integration.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <MessageSquare className="h-5 w-5" />
                          <h4 className="font-semibold">{integration.platform}</h4>
                          {integration.isActive ? (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded text-xs">
                              Ativa
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs">
                              Inativa
                            </span>
                          )}
                        </div>
                        
                        {integration.chatId && (
                          <p className="text-sm text-muted-foreground mb-2">
                            Chat ID: {integration.chatId}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                          <span>Comandos: {integration.enabledCommands.length}</span>
                          <span>Usos: {integration.usageCount}</span>
                          {integration.lastUsed && (
                            <span>
                              Último: {new Date(integration.lastUsed).toLocaleString('pt-BR')}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2 text-xs">
                          {integration.notifyTransactions && (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded">
                              Transações
                            </span>
                          )}
                          {integration.notifyGoals && (
                            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded">
                              Metas
                            </span>
                          )}
                          {integration.notifyAlerts && (
                            <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded">
                              Alertas
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteIntegration(integration.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>

          {/* Guia de Configuração Telegram */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Como configurar o Telegram Bot
            </h3>
            
            <ol className="space-y-2 text-sm">
              <li>1. Fale com o <strong>@BotFather</strong> no Telegram</li>
              <li>2. Use o comando <code className="bg-black/10 dark:bg-white/10 px-2 py-1 rounded">/newbot</code></li>
              <li>3. Copie o <strong>Token</strong> fornecido</li>
              <li>4. Adicione uma nova integração acima</li>
              <li>5. Cole o token e configure os comandos</li>
              <li>6. Envie <code className="bg-black/10 dark:bg-white/10 px-2 py-1 rounded">/start</code> para o bot</li>
            </ol>
          </Card>
        </TabsContent>
      </Tabs>

      <Toast
        open={toastOpen}
        message={toastMessage}
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
}
