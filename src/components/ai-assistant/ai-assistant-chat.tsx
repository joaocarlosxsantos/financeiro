"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, TrendingUp, AlertCircle, Lightbulb, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatMessage, ChatResponse, AssistantInsight } from '@/types/ai-assistant';

interface AIAssistantChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AIAssistantChat({ isOpen, onClose }: AIAssistantChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<AssistantInsight[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll para última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus no input quando abrir
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      // Mensagem de boas-vindas
      if (messages.length === 0) {
        const welcomeMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '👋 Olá! Sou seu consultor financeiro pessoal. Posso te ajudar a entender suas finanças, encontrar oportunidades de economia e alcançar suas metas. Como posso te ajudar hoje?',
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
        setSuggestions([
          'Quanto gastei este mês?',
          'Como posso economizar?',
          'Qual minha situação financeira?',
          'Como estão minhas metas?'
        ]);
      }
    }
  }, [isOpen]);

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || loading) return;

    // Adicionar mensagem do usuário
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai-assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          includeContext: true
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao processar mensagem');
      }

      const data: ChatResponse = await response.json();

      // Adicionar resposta do assistente
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Atualizar insights e sugestões
      if (data.insights) setInsights(data.insights);
      if (data.suggestions) setSuggestions(data.suggestions);

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getInsightIcon = (type: AssistantInsight['type']) => {
    switch (type) {
      case 'savings': return <TrendingUp className="h-4 w-4" />;
      case 'spending': return <AlertCircle className="h-4 w-4" />;
      case 'goal': return <Target className="h-4 w-4" />;
      case 'tip': return <Lightbulb className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  const getInsightColor = (type: AssistantInsight['type'], priority: AssistantInsight['priority']) => {
    if (priority === 'high') {
      return type === 'warning' ? 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300' : 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300';
    }
    if (priority === 'medium') {
      return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-300';
    }
    return 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md h-[600px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-purple-600 to-blue-600 rounded-t-2xl">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="h-5 w-5" />
            <h2 className="font-semibold">Consultor Financeiro IA</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-800 p-3 max-h-32 overflow-y-auto">
            <div className="space-y-2">
              {insights.slice(0, 2).map((insight, idx) => (
                <div
                  key={idx}
                  className={`text-xs p-2 rounded-lg border ${getInsightColor(insight.type, insight.priority)}`}
                >
                  <div className="flex items-center gap-2 font-medium mb-1">
                    {getInsightIcon(insight.type)}
                    {insight.title}
                  </div>
                  <div className="opacity-90">{insight.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && messages.length <= 2 && (
          <div className="border-t border-gray-200 dark:border-gray-800 p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Sugestões:</div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(suggestion)}
                  disabled={loading}
                  className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-4">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua pergunta..."
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-600 disabled:opacity-50"
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl px-4"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
