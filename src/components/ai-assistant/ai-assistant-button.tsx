"use client";

import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useSession } from 'next-auth/react';
import AIAssistantChat from './ai-assistant-chat';

/**
 * Botão flutuante para abrir o assistente de IA
 * Visível apenas para usuários autenticados
 */
export default function AIAssistantButton() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  // Não mostrar para usuários não autenticados
  if (!session?.user) {
    return null;
  }

  return (
    <>
      {/* Botão Flutuante */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-800"
        aria-label="Abrir Consultor Financeiro IA"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {/* Chat do Assistente */}
      <AIAssistantChat isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
