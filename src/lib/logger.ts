/**
 * Logger centralizado para a aplicação
 * Oferece métodos para logging estruturado (info, error, warn, debug)
 * Com suporte a contexto adicional e stack traces
 */

type LogLevel = 'info' | 'error' | 'warn' | 'debug';

interface LogContext {
  [key: string]: unknown;
}

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Formata o timestamp no formato ISO 8601
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Formata a mensagem de log com contexto
 */
function formatLogMessage(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error | unknown,
): string {
  const timestamp = getTimestamp();
  let output = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  if (context && Object.keys(context).length > 0) {
    output += ` | Context: ${JSON.stringify(context)}`;
  }

  if (error) {
    if (error instanceof Error) {
      output += ` | Error: ${error.message}`;
      if (isDevelopment && error.stack) {
        output += ` | Stack: ${error.stack}`;
      }
    } else {
      output += ` | Error: ${JSON.stringify(error)}`;
    }
  }

  return output;
}

/**
 * Logger info - para informações gerais
 */
export function logInfo(message: string, context?: LogContext): void {
  const formatted = formatLogMessage('info', message, context);
  //console.log(formatted);
}

/**
 * Logger error - para erros
 */
export function logError(message: string, error?: Error | unknown, context?: LogContext): void {
  const formatted = formatLogMessage('error', message, context, error);
  console.error(formatted);

  // Em produção, pode enviar para serviço de monitoramento
  if (!isDevelopment && process.env.LOG_SERVICE_URL) {
    // TODO: Implementar envio para serviço de logging externo
  }
}

/**
 * Logger warn - para avisos
 */
export function logWarn(message: string, context?: LogContext): void {
  const formatted = formatLogMessage('warn', message, context);
  console.warn(formatted);
}

/**
 * Logger debug - apenas em desenvolvimento
 */
export function logDebug(message: string, context?: LogContext): void {
  if (isDevelopment) {
    const formatted = formatLogMessage('debug', message, context);
    console.debug(formatted);
  }
}

/**
 * Log de requisição de API - para auditoria
 */
export function logApiRequest(
  method: string,
  path: string,
  userId?: string,
  context?: LogContext,
): void {
  logInfo(`API Request: ${method} ${path}`, {
    userId,
    ...context,
  });
}

/**
 * Log de resposta de API
 */
export function logApiResponse(
  method: string,
  path: string,
  statusCode: number,
  duration?: number,
  context?: LogContext,
): void {
  logInfo(`API Response: ${method} ${path} - ${statusCode}`, {
    duration: `${duration}ms`,
    ...context,
  });
}

/**
 * Log de erro de validação
 */
export function logValidationError(
  message: string,
  errors: Record<string, unknown>,
  context?: LogContext,
): void {
  logError(message, undefined, {
    validationErrors: errors,
    ...context,
  });
}

export const logger = {
  info: logInfo,
  error: logError,
  warn: logWarn,
  debug: logDebug,
  apiRequest: logApiRequest,
  apiResponse: logApiResponse,
  validationError: logValidationError,
};
