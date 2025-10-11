'use client';

import { useState, useCallback } from 'react';

export interface ImportNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'progress';
  title: string;
  message: string;
  timestamp: Date;
  progress?: number;
}

export interface ImportProgress {
  status: 'idle' | 'processing' | 'completed';
  totalFiles: number;
  processedFiles: number;
  totalTransactions: number;
  processedTransactions: number;
  currentFile?: string;
}

export function useImportNotifications() {
  const [notifications, setNotifications] = useState<ImportNotification[]>([]);
  const [progress, setProgress] = useState<ImportProgress>({
    totalFiles: 0,
    processedFiles: 0,
    totalTransactions: 0,
    processedTransactions: 0,
    status: 'idle'
  });

  const addNotification = useCallback((
    type: ImportNotification['type'], 
    title: string, 
    message: string,
    progressValue?: number
  ) => {
    const newNotification: ImportNotification = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      title,
      message,
      timestamp: new Date(),
      progress: progressValue
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Auto-remover notificações após 10 segundos para sucesso e info
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
      }, 10000);
    }

    return newNotification.id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const startProgress = useCallback((initialProgress: Partial<ImportProgress>) => {
    setProgress(prev => ({
      ...prev,
      ...initialProgress,
      status: 'processing',
      processedFiles: 0,
      processedTransactions: 0
    }));
  }, []);

  const updateProgress = useCallback((updates: Partial<ImportProgress>) => {
    setProgress(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  const completeProgress = useCallback(() => {
    setProgress(prev => ({
      ...prev,
      status: 'completed'
    }));

    // Auto reset após 5 segundos
    setTimeout(() => {
      setProgress({
        totalFiles: 0,
        processedFiles: 0,
        totalTransactions: 0,
        processedTransactions: 0,
        status: 'idle'
      });
    }, 5000);
  }, []);

  const resetProgress = useCallback(() => {
    setProgress({
      totalFiles: 0,
      processedFiles: 0,
      totalTransactions: 0,
      processedTransactions: 0,
      status: 'idle'
    });
  }, []);

  return {
    notifications,
    progress,
    addNotification,
    removeNotification,
    clearAllNotifications,
    startProgress,
    updateProgress,
    completeProgress,
    resetProgress
  };
}