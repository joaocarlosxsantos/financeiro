// Versão testável do rate limiter sem dependências Next.js

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

interface MockRequest {
  headers: {
    get: (header: string) => string | null;
  };
}

interface MockResponse {
  json: () => Promise<any>;
  status: number;
  headers: {
    get: (header: string) => string | null;
  };
}

// In-memory store para testes
const testStore: RateLimitStore = {};

export function clearTestStore() {
  Object.keys(testStore).forEach(key => {
    delete testStore[key];
  });
}

export async function testRateLimit(
  req: MockRequest,
  options: RateLimitOptions
): Promise<MockResponse | null> {
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             '127.0.0.1';
  
  const key = `rate_limit:${ip}`;
  const now = Date.now();
  const resetTime = now + options.windowMs;

  const current = testStore[key];

  if (!current || current.resetTime < now) {
    testStore[key] = {
      count: 1,
      resetTime
    };
    return null;
  }

  if (current.count >= options.maxRequests) {
    const retryAfter = Math.ceil((current.resetTime - now) / 1000);
    
    return {
      json: async () => ({
        error: options.message || 'Rate limit exceeded',
        retryAfter: retryAfter
      }),
      status: 429,
      headers: {
        get: (header: string) => {
          const headers: Record<string, string> = {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': options.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': current.resetTime.toString()
          };
          return headers[header] || null;
        }
      }
    };
  }

  testStore[key].count++;
  return null;
}

export async function testUserRateLimit(
  req: MockRequest,
  userId: string,
  options: RateLimitOptions
): Promise<MockResponse | null> {
  const key = `rate_limit:user:${userId}`;
  const now = Date.now();
  const resetTime = now + options.windowMs;

  const current = testStore[key];

  if (!current || current.resetTime < now) {
    testStore[key] = {
      count: 1,
      resetTime
    };
    return null;
  }

  if (current.count >= options.maxRequests) {
    const retryAfter = Math.ceil((current.resetTime - now) / 1000);
    
    return {
      json: async () => ({
        error: options.message || 'User rate limit exceeded',
        retryAfter: retryAfter
      }),
      status: 429,
      headers: {
        get: (header: string) => {
          const headers: Record<string, string> = {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': options.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': current.resetTime.toString()
          };
          return headers[header] || null;
        }
      }
    };
  }

  testStore[key].count++;
  return null;
}

export const TEST_RATE_LIMITS = {
  GENERAL: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000,
    message: 'Muitas tentativas. Tente novamente em 15 minutos.'
  },
  NOTIFICATIONS_READ: {
    maxRequests: 200,
    windowMs: 15 * 60 * 1000,
    message: 'Limite de leitura de notificações excedido.'
  },
  NOTIFICATIONS_CREATE: {
    maxRequests: 20,
    windowMs: 15 * 60 * 1000,
    message: 'Limite de criação de notificações excedido.'
  }
} as const;