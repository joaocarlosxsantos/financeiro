'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Clock, 
  X,
  FileText,
  Package
} from 'lucide-react';
import { useImportNotifications, ImportNotification } from '@/hooks/use-import-notifications';

interface ImportNotificationsPanelProps {
  className?: string;
}

export function ImportNotificationsPanel({ className }: ImportNotificationsPanelProps) {
  const { 
    notifications, 
    progress, 
    removeNotification, 
    clearAllNotifications 
  } = useImportNotifications();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'progress':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getProgressPercentage = () => {
    if (progress.totalTransactions === 0) return 0;
    return Math.round((progress.processedTransactions / progress.totalTransactions) * 100);
  };

  if (notifications.length === 0 && progress.status === 'idle') {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Progresso da Importação Atual */}
      {progress.status === 'processing' && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Importação em Andamento
              </CardTitle>
              <Badge variant="outline" className="text-blue-700 border-blue-300">
                {getProgressPercentage()}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span>{progress.processedFiles}/{progress.totalFiles} arquivos</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                <span>{progress.processedTransactions}/{progress.totalTransactions} transações</span>
              </div>
            </div>
            
            <Progress 
              value={getProgressPercentage()} 
              className="h-2"
            />
            
            <p className="text-xs text-blue-700 dark:text-blue-200">
              {progress.currentFile ? `Processando: ${progress.currentFile}` : 'Processando arquivos...'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Lista de Notificações */}
      {notifications.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Notificações de Importação ({notifications.length})
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllNotifications}
                className="text-xs"
              >
                Limpar Todas
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 max-h-80 overflow-y-auto">
            {notifications.map((notification: ImportNotification) => (
              <div
                key={notification.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-medium text-sm truncate">
                        {notification.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {formatTime(notification.timestamp)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeNotification(notification.id)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {notification.progress !== undefined && (
                    <div className="mt-2">
                      <Progress value={notification.progress} className="h-1" />
                      <span className="text-xs text-muted-foreground">
                        {notification.progress}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}