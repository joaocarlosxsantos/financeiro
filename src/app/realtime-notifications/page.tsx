'use client';

import { useState } from 'react';
import { NotificationStream } from '@/components/notifications/NotificationStream';
import { Zap, Send, TestTube, Wifi } from 'lucide-react';

export default function RealtimeNotificationsDemo() {
  const [isLoading, setIsLoading] = useState(false);
  const [testData, setTestData] = useState({
    title: 'Notificação de Teste',
    message: 'Esta é uma notificação de teste do sistema em tempo real',
    type: 'info' as 'info' | 'success' | 'warning' | 'error',
    severity: 'medium' as 'low' | 'medium' | 'high',
    category: 'system' as 'transaction' | 'alert' | 'system' | 'goal' | 'budget'
  });

  const sendTestNotification = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar notificação');
      }

    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendTemplatedNotification = async (template: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/notifications/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          template,
          ...(template === 'transactionCreated' && { amount: 150.50, description: 'Compra no supermercado' }),
          ...(template === 'budgetWarning' && { category: 'Alimentação', spent: 800, limit: 1000 }),
          ...(template === 'goalProgress' && { goalName: 'Economia para férias', progress: 75 }),
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar notificação template');
      }

    } catch (error) {
      console.error('Erro ao enviar notificação template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center space-x-3 mb-8">
        <div className="bg-blue-100 p-3 rounded-full">
          <Zap className="h-8 w-8 text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Notificações em Tempo Real
          </h1>
          <p className="text-gray-600 mt-1">
            Sistema de notificações instantâneas com Server-Sent Events
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Controls */}
        <div className="space-y-6">
          {/* Test Notification Form */}
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <TestTube className="h-5 w-5" />
              <h3 className="text-lg font-medium">Teste de Notificação</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Envie uma notificação personalizada para testar o sistema
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="title">
                  Título
                </label>
                <input
                  id="title"
                  type="text"
                  value={testData.title}
                  onChange={(e) => setTestData({ ...testData, title: e.target.value })}
                  placeholder="Título da notificação"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="message">
                  Mensagem
                </label>
                <textarea
                  id="message"
                  value={testData.message}
                  onChange={(e) => setTestData({ ...testData, message: e.target.value })}
                  placeholder="Conteúdo da notificação"
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo</label>
                  <select
                    value={testData.type}
                    onChange={(e) => setTestData({ ...testData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="info">Info</option>
                    <option value="success">Sucesso</option>
                    <option value="warning">Aviso</option>
                    <option value="error">Erro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Severidade</label>
                  <select
                    value={testData.severity}
                    onChange={(e) => setTestData({ ...testData, severity: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={sendTestNotification}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <Send className="h-4 w-4" />
                <span>{isLoading ? 'Enviando...' : 'Enviar Teste'}</span>
              </button>
            </div>
          </div>

          {/* Templates */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">Templates Predefinidos</h3>
            <p className="text-gray-600 mb-4">Teste notificações com templates comuns</p>
            
            <div className="space-y-3">
              <button
                onClick={() => sendTemplatedNotification('transactionCreated')}
                disabled={isLoading}
                className="w-full text-left p-3 border rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2">
                  Transação
                </span>
                Nova Transação Criada
              </button>

              <button
                onClick={() => sendTemplatedNotification('budgetWarning')}
                disabled={isLoading}
                className="w-full text-left p-3 border rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded mr-2">
                  Orçamento
                </span>
                Aviso de Orçamento
              </button>

              <button
                onClick={() => sendTemplatedNotification('goalProgress')}
                disabled={isLoading}
                className="w-full text-left p-3 border rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded mr-2">
                  Meta
                </span>
                Progresso da Meta
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Notification Stream */}
        <div>
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Wifi className="h-5 w-5 text-green-500" />
              <h3 className="text-lg font-medium">Stream de Notificações</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Notificações aparecem aqui em tempo real
            </p>
            <NotificationStream />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-medium mb-6">Recursos Implementados</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h4 className="font-medium text-green-600">✅ Conectividade</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Server-Sent Events (SSE)</li>
              <li>• Reconexão automática</li>
              <li>• Heartbeat para manter viva</li>
              <li>• Indicador de status</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-green-600">✅ Segurança</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Rate limiting por IP</li>
              <li>• Autenticação obrigatória</li>
              <li>• Validação de dados</li>
              <li>• Sanitização de conteúdo</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-green-600">✅ UX/UI</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Toast notifications</li>
              <li>• Notificações do browser</li>
              <li>• Categorização visual</li>
              <li>• Auto-close inteligente</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-green-600">✅ Performance</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Conexões por usuário</li>
              <li>• Limpeza automática</li>
              <li>• Limite de notificações</li>
              <li>• Gerenciamento de memória</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-green-600">✅ Templates</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Transações</li>
              <li>• Orçamentos</li>
              <li>• Metas</li>
              <li>• Sistema</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-green-600">✅ Integração</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Hook React personalizado</li>
              <li>• Componentes reutilizáveis</li>
              <li>• API de notificações</li>
              <li>• Sistema de eventos</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}