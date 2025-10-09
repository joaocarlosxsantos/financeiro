import { 
  sanitizeHtml, 
  sanitizeObject, 
  secureNotificationSchemas, 
  secureAlertSchemas,
  validateAndSanitize,
  detectAttackAttempt 
} from '../../src/lib/validation';

describe('Validation and Sanitization', () => {
  describe('sanitizeHtml', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello World<img src="x">';
      const result = sanitizeHtml(input);
      expect(result).toBe('alert(xss)Hello World');
    });

    it('should remove dangerous protocols', () => {
      const input = 'Click here: javascript:alert("xss")';
      const result = sanitizeHtml(input);
      expect(result).toBe('Click here: alert(xss)');
    });

    it('should remove event handlers', () => {
      const input = 'Hello onclick="alert(1)" World';
      const result = sanitizeHtml(input);
      expect(result).toBe('Hello  World');
    });

    it('should handle empty and non-string inputs', () => {
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml(null as any)).toBe('');
      expect(sanitizeHtml(undefined as any)).toBe('');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize string properties', () => {
      const input = {
        title: '<script>alert("xss")</script>Clean Title',
        message: 'Hello onclick="danger" World'
      };
      const result = sanitizeObject(input);
      expect(result.title).toBe('alert(xss)Clean Title');
      expect(result.message).toBe('Hello  World');
    });

    it('should handle nested objects', () => {
      const input = {
        data: {
          nested: '<img onerror="alert(1)" src="x">Text'
        }
      };
      const result = sanitizeObject(input);
      expect(result.data.nested).toBe('Text');
    });

    it('should handle arrays', () => {
      const input = {
        items: ['<script>bad</script>Good', 'javascript:alert(1)Normal']
      };
      const result = sanitizeObject(input);
      expect(result.items[0]).toBe('badGood');
      expect(result.items[1]).toBe('alert(1)Normal');
    });
  });

  describe('secureNotificationSchemas', () => {
    describe('create schema', () => {
      it('should validate correct notification data', async () => {
        const validData = {
          type: 'BUDGET_EXCEEDED',
          title: 'Budget Alert',
          message: 'Your budget has been exceeded',
          priority: 'HIGH'
        };

        const validation = await validateAndSanitize(
          secureNotificationSchemas.create, 
          validData
        );

        expect(validation.success).toBe(true);
        if (validation.success) {
          expect(validation.data.type).toBe('BUDGET_EXCEEDED');
          expect(validation.data.title).toBe('Budget Alert');
        }
      });

      it('should reject malicious script injection', async () => {
        const maliciousData = {
          type: 'CUSTOM',
          title: '<script>alert("xss")</script>Malicious Title',
          message: 'Safe message',
          priority: 'HIGH'
        };

        const validation = await validateAndSanitize(
          secureNotificationSchemas.create, 
          maliciousData
        );

        expect(validation.success).toBe(false);
        if (!validation.success) {
          expect(validation.errors.join(' ')).toContain('Conteúdo inválido detectado');
        }
      });

      it('should reject dangerous event handlers', async () => {
        const maliciousData = {
          type: 'CUSTOM',
          title: 'Title onclick="alert(1)"',
          message: 'Safe message'
        };

        const validation = await validateAndSanitize(
          secureNotificationSchemas.create, 
          maliciousData
        );

        expect(validation.success).toBe(false);
      });

      it('should reject oversized data', async () => {
        const oversizedData = {
          type: 'CUSTOM',
          title: 'A'.repeat(300), // Exceeds 255 char limit
          message: 'Safe message'
        };

        const validation = await validateAndSanitize(
          secureNotificationSchemas.create, 
          oversizedData
        );

        expect(validation.success).toBe(false);
        if (!validation.success) {
          expect(validation.errors.join(' ')).toContain('Máximo 255 caracteres');
        }
      });
    });

    describe('filter schema', () => {
      it('should validate correct filter parameters', async () => {
        const validFilter = {
          isRead: false,
          type: 'BUDGET_EXCEEDED',
          priority: 'HIGH',
          limit: 50,
          offset: 0
        };

        const validation = await validateAndSanitize(
          secureNotificationSchemas.filter, 
          validFilter
        );

        expect(validation.success).toBe(true);
      });

      it('should reject invalid limit values', async () => {
        const invalidFilter = {
          limit: 150 // Exceeds max of 100
        };

        const validation = await validateAndSanitize(
          secureNotificationSchemas.filter, 
          invalidFilter
        );

        expect(validation.success).toBe(false);
      });
    });
  });

  describe('secureAlertSchemas', () => {
    it('should validate correct alert configuration', async () => {
      const validAlert = {
        type: 'BUDGET_EXCEEDED',
        isEnabled: true,
        thresholdAmount: 1000,
        thresholdPercent: 80
      };

      const validation = await validateAndSanitize(
        secureAlertSchemas.create, 
        validAlert
      );

      expect(validation.success).toBe(true);
      if (validation.success) {
        expect(validation.data.thresholdAmount).toBe(1000);
        expect(validation.data.thresholdPercent).toBe(80);
      }
    });

    it('should reject negative threshold amounts', async () => {
      const invalidAlert = {
        type: 'BUDGET_EXCEEDED',
        isEnabled: true,
        thresholdAmount: -100
      };

      const validation = await validateAndSanitize(
        secureAlertSchemas.create, 
        invalidAlert
      );

      expect(validation.success).toBe(false);
      if (!validation.success) {
        expect(validation.errors.join(' ')).toContain('Valor deve ser positivo');
      }
    });

    it('should reject invalid threshold percentages', async () => {
      const invalidAlert = {
        type: 'BUDGET_EXCEEDED',
        isEnabled: true,
        thresholdPercent: 150 // Exceeds 100%
      };

      const validation = await validateAndSanitize(
        secureAlertSchemas.create, 
        invalidAlert
      );

      expect(validation.success).toBe(false);
      if (!validation.success) {
        expect(validation.errors.join(' ')).toContain('Percentual não pode exceder 100%');
      }
    });
  });

  describe('detectAttackAttempt', () => {
    it('should detect XSS script injection', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const result = detectAttackAttempt(maliciousInput);
      
      expect(result.isAttack).toBe(true);
      expect(result.attackType).toBe('XSS Script Injection');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect JavaScript protocol attacks', () => {
      const maliciousInput = 'javascript:alert("xss")';
      const result = detectAttackAttempt(maliciousInput);
      
      expect(result.isAttack).toBe(true);
      expect(result.attackType).toBe('JavaScript Protocol');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect event handler injection', () => {
      const maliciousInput = 'onclick="alert(1)"';
      const result = detectAttackAttempt(maliciousInput);
      
      expect(result.isAttack).toBe(true);
      expect(result.attackType).toBe('Event Handler Injection');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should not flag safe content', () => {
      const safeInput = 'This is a safe message with normal content';
      const result = detectAttackAttempt(safeInput);
      
      expect(result.isAttack).toBe(false);
      expect(result.attackType).toBe(null);
      expect(result.confidence).toBe(0);
    });

    it('should handle multiple attack patterns', () => {
      const maliciousInput = '<script>document.cookie</script>javascript:alert(1)';
      const result = detectAttackAttempt(maliciousInput);
      
      expect(result.isAttack).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Edge cases', () => {
    it('should handle null and undefined inputs gracefully', async () => {
      const validation1 = await validateAndSanitize(
        secureNotificationSchemas.create, 
        null
      );
      expect(validation1.success).toBe(false);

      const validation2 = await validateAndSanitize(
        secureNotificationSchemas.create, 
        undefined
      );
      expect(validation2.success).toBe(false);
    });

    it('should handle malformed JSON gracefully', async () => {
      const malformedData: any = {
        type: 'CUSTOM',
        title: 'Title',
        message: 'Message',
        data: { circular: null }
      };
      // Create circular reference
      malformedData.data.circular = malformedData;

      const validation = await validateAndSanitize(
        secureNotificationSchemas.create, 
        malformedData
      );

      // Should handle circular references gracefully
      expect(validation.success).toBe(false);
    });
  });
});