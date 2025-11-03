import { NextRequest, NextResponse } from 'next/server';

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  message?: string;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store para desenvolvimento (use Redis em produção)
const store: RateLimitStore = {};

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

export async function withRateLimit(
  req: NextRequest,
  options: RateLimitOptions
) {
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             '127.0.0.1';
  
  const key = `rate_limit:${ip}`;
  const now = Date.now();
  const resetTime = now + options.windowMs;

  // Get current count for this IP
  const current = store[key];

  if (!current || current.resetTime < now) {
    // First request or window expired
    store[key] = {
      count: 1,
      resetTime
    };
    return null; // Allow request
  }

  if (current.count >= options.maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((current.resetTime - now) / 1000);
    
    return NextResponse.json(
      { 
        error: options.message || 'Rate limit exceeded',
        retryAfter: retryAfter
      },
      { 
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': options.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': current.resetTime.toString()
        }
      }
    );
  }

  // Increment count
  store[key].count++;
  
  return null; // Allow request
}

export async function withUserRateLimit(
  req: NextRequest,
  userId: string,
  options: RateLimitOptions
) {
  const key = `rate_limit:user:${userId}`;
  const now = Date.now();
  const resetTime = now + options.windowMs;

  const current = store[key];

  if (!current || current.resetTime < now) {
    store[key] = {
      count: 1,
      resetTime
    };
    return null;
  }

  if (current.count >= options.maxRequests) {
    const retryAfter = Math.ceil((current.resetTime - now) / 1000);
    
    return NextResponse.json(
      { 
        error: options.message || 'User rate limit exceeded',
        retryAfter: retryAfter
      },
      { 
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': options.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': current.resetTime.toString()
        }
      }
    );
  }

  store[key].count++;
  return null;
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // General API limits
  GENERAL: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Muitas tentativas. Tente novamente em 15 minutos.'
  },
  
  // Notifications specific limits
  NOTIFICATIONS_READ: {
    maxRequests: 200,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Limite de leitura de notificações excedido.'
  },
  
  NOTIFICATIONS_CREATE: {
    maxRequests: 20,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Limite de criação de notificações excedido.'
  },
  
  NOTIFICATIONS_BULK: {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Limite de operações em lote excedido.'
  },
  
  // Alert configuration limits
  ALERTS_CONFIG: {
    maxRequests: 30,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Limite de configuração de alertas excedido.'
  },
  
  // Strict limits for sensitive operations
  ALERTS_DELETE: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Muitas tentativas de exclusão. Aguarde antes de tentar novamente.'
  },
  
  // Financial operations limits
  TRANSACTIONS_CREATE: {
    maxRequests: 50,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Limite de criação de transações excedido. Aguarde 15 minutos.'
  },
  
  TRANSACTIONS_UPDATE: {
    maxRequests: 60,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Limite de atualização de transações excedido. Aguarde 15 minutos.'
  },
  
  TRANSACTIONS_DELETE: {
    maxRequests: 30,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Limite de exclusão de transações excedido. Aguarde 15 minutos.'
  },
  
  IMPORT_EXTRACT: {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Limite de importação de extratos excedido. Aguarde 15 minutos.'
  },
  
  APIKEY_OPERATIONS: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Limite de operações com API Key excedido. Aguarde 15 minutos.'
  }
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;