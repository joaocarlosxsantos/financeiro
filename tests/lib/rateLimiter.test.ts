import { 
  testRateLimit, 
  testUserRateLimit, 
  TEST_RATE_LIMITS, 
  clearTestStore 
} from './rateLimiterTest';

// Mock request helper
const createMockRequest = (ip: string = '127.0.0.1') => {
  return {
    headers: {
      get: (header: string) => {
        if (header === 'x-forwarded-for') return ip;
        if (header === 'x-real-ip') return ip;
        return null;
      }
    }
  };
};

describe('Rate Limiter', () => {
  beforeEach(() => {
    clearTestStore();
  });

  describe('testRateLimit', () => {
    it('should allow requests within rate limit', async () => {
      const req = createMockRequest('192.168.1.1');
      const options = { maxRequests: 5, windowMs: 60000 };

      // First request should be allowed
      const result1 = await testRateLimit(req, options);
      expect(result1).toBeNull();

      // Second request should be allowed
      const result2 = await testRateLimit(req, options);
      expect(result2).toBeNull();
    });

    it('should block requests when rate limit exceeded', async () => {
      const req = createMockRequest('192.168.1.2');
      const options = { maxRequests: 2, windowMs: 60000 };

      // Make requests up to the limit
      await testRateLimit(req, options);
      await testRateLimit(req, options);

      // Third request should be blocked
      const result = await testRateLimit(req, options);
      expect(result).not.toBeNull();
      
      if (result) {
        expect(result.status).toBe(429);
        
        // Check response body
        const body = await result.json();
        expect(body.error).toContain('Rate limit exceeded');
        expect(body.retryAfter).toBeGreaterThan(0);
        
        // Check headers
        expect(result.headers.get('Retry-After')).toBeTruthy();
        expect(result.headers.get('X-RateLimit-Limit')).toBe('2');
        expect(result.headers.get('X-RateLimit-Remaining')).toBe('0');
      }
    });

    it('should reset after window expires', async () => {
      const req = createMockRequest('192.168.1.3');
      const options = { maxRequests: 1, windowMs: 100 }; // 100ms window

      // First request allowed
      const result1 = await testRateLimit(req, options);
      expect(result1).toBeNull();

      // Second request blocked
      const result2 = await testRateLimit(req, options);
      expect(result2).not.toBeNull();

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Request should be allowed again
      const result3 = await testRateLimit(req, options);
      expect(result3).toBeNull();
    });

    it('should handle different IPs independently', async () => {
      const req1 = createMockRequest('192.168.1.4');
      const req2 = createMockRequest('192.168.1.5');
      const options = { maxRequests: 1, windowMs: 60000 };

      // Both IPs should get their first request
      const result1 = await testRateLimit(req1, options);
      expect(result1).toBeNull();

      const result2 = await testRateLimit(req2, options);
      expect(result2).toBeNull();

      // Both IPs should be blocked on second request
      const result3 = await testRateLimit(req1, options);
      expect(result3).not.toBeNull();

      const result4 = await testRateLimit(req2, options);
      expect(result4).not.toBeNull();
    });
  });

  describe('testUserRateLimit', () => {
    it('should limit by user ID', async () => {
      const req = createMockRequest();
      const userId = 'user123';
      const options = { maxRequests: 2, windowMs: 60000 };

      // First two requests allowed
      const result1 = await testUserRateLimit(req, userId, options);
      expect(result1).toBeNull();

      const result2 = await testUserRateLimit(req, userId, options);
      expect(result2).toBeNull();

      // Third request blocked
      const result3 = await testUserRateLimit(req, userId, options);
      expect(result3).not.toBeNull();
    });

    it('should handle different users independently', async () => {
      const req = createMockRequest();
      const options = { maxRequests: 1, windowMs: 60000 };

      // Different users should get independent limits
      const result1 = await testUserRateLimit(req, 'user1', options);
      expect(result1).toBeNull();

      const result2 = await testUserRateLimit(req, 'user2', options);
      expect(result2).toBeNull();

      // Both users should be blocked on second request
      const result3 = await testUserRateLimit(req, 'user1', options);
      expect(result3).not.toBeNull();

      const result4 = await testUserRateLimit(req, 'user2', options);
      expect(result4).not.toBeNull();
    });
  });

  describe('TEST_RATE_LIMITS constants', () => {
    it('should have correct configuration for general API', () => {
      expect(TEST_RATE_LIMITS.GENERAL.maxRequests).toBe(100);
      expect(TEST_RATE_LIMITS.GENERAL.windowMs).toBe(15 * 60 * 1000);
    });

    it('should have higher limits for read operations', () => {
      expect(TEST_RATE_LIMITS.NOTIFICATIONS_READ.maxRequests).toBeGreaterThan(TEST_RATE_LIMITS.NOTIFICATIONS_CREATE.maxRequests);
    });
  });

  describe('Custom error messages', () => {
    it('should use custom error message when provided', async () => {
      const req = createMockRequest('192.168.1.6');
      const options = { 
        maxRequests: 1, 
        windowMs: 60000,
        message: 'Custom rate limit message'
      };

      // Exhaust the limit
      await testRateLimit(req, options);

      // Next request should be blocked with custom message
      const result = await testRateLimit(req, options);
      expect(result).not.toBeNull();
      
      if (result) {
        const body = await result.json();
        expect(body.error).toBe('Custom rate limit message');
      }
    });
  });
});