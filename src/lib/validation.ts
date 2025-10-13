import { z } from 'zod';

// Função para sanitizar HTML/JavaScript malicioso
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Remove tags HTML, scripts e caracteres perigosos
  const cleaned = input
    .replace(/<[^>]*>/g, '') // Remove tags HTML
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers with quotes
    .replace(/on\w+\s*=\s*[^"\s>]+/gi, '') // Remove event handlers without quotes
    .replace(/[<>"'`]/g, '') // Remove caracteres potencialmente perigosos
    .replace(/\\/g, ''); // Remove backslashes
  
  return cleaned.trim();
}

// Função para sanitizar objetos recursivamente
export function sanitizeObject<T = unknown>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return sanitizeHtml(obj) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject) as T;
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const cleanKey = sanitizeHtml(key);
      sanitized[cleanKey] = sanitizeObject(value);
    }
    return sanitized as T;
  }

  return obj;
}

// Validador personalizado para prevenir XSS
const secureStringValidator = (maxLength: number = 1000) => 
  z.string()
    .min(1, "Campo obrigatório")
    .max(maxLength, `Máximo ${maxLength} caracteres`)
    .transform(str => str.trim())
    .refine(
      str => !/<script|javascript:|data:|vbscript:|on\w+=/i.test(str),
      "Conteúdo inválido detectado"
    )
    .refine(
      str => !/[<>\"'`\\]/.test(str),
      "Caracteres potencialmente perigosos detectados"
    )
    .transform(sanitizeHtml);

// Validador para IDs (UUIDs/CUIDs)
const secureIdValidator = z.string()
  .min(1, "ID obrigatório")
  .max(50, "ID muito longo")
  .regex(/^[a-zA-Z0-9_-]+$/, "ID contém caracteres inválidos");

// Validador para arrays de IDs
const secureIdArrayValidator = z.array(secureIdValidator)
  .max(100, "Muitos IDs fornecidos")
  .refine(
    arr => new Set(arr).size === arr.length,
    "IDs duplicados não são permitidos"
  );

// Validador para dados JSON seguros
const secureJsonValidator = z.any()
  .refine(
    data => {
      try {
        const str = JSON.stringify(data);
        return str.length < 10000; // Limite de 10KB
      } catch {
        return false;
      }
    },
    "Dados JSON muito grandes ou inválidos"
  )
  .transform(sanitizeObject);

// Schemas seguros para notificações
export const secureNotificationSchemas = {
  create: z.object({
    type: z.enum([
      'BUDGET_EXCEEDED',
      'UNUSUAL_SPENDING',
      'LOW_BALANCE',
      'GOAL_AT_RISK',
      'DUPLICATE_TRANSACTION',
      'RECURRING_DUE',
      'MONTHLY_SUMMARY',
      'ACHIEVEMENT',
      'SYSTEM',
      'CUSTOM'
    ]),
    title: secureStringValidator(255),
    message: secureStringValidator(1000),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    data: secureJsonValidator.optional(),
    scheduledFor: z.string().datetime().optional()
  }),

  update: z.object({
    isRead: z.boolean().optional(),
    isActive: z.boolean().optional()
  }),

  filter: z.object({
    isRead: z.boolean().optional(),
    type: z.enum([
      'BUDGET_EXCEEDED',
      'UNUSUAL_SPENDING', 
      'LOW_BALANCE',
      'GOAL_AT_RISK',
      'DUPLICATE_TRANSACTION',
      'RECURRING_DUE',
      'MONTHLY_SUMMARY',
      'ACHIEVEMENT',
      'SYSTEM',
      'CUSTOM'
    ]).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    limit: z.number().min(1).max(100).optional(),
    offset: z.number().min(0).max(10000).optional()
  })
};

// Schemas seguros para configurações de alerta
export const secureAlertSchemas = {
  create: z.object({
    type: z.enum([
      'BUDGET_EXCEEDED',
      'UNUSUAL_SPENDING',
      'LOW_BALANCE',
      'GOAL_AT_RISK',
      'DUPLICATE_TRANSACTION',
      'RECURRING_DUE',
      'MONTHLY_SUMMARY'
    ]),
    isEnabled: z.boolean(),
    thresholdAmount: z.number()
      .positive("Valor deve ser positivo")
      .max(1000000, "Valor muito alto")
      .optional()
      .nullable()
      .transform(val => val ?? undefined),
    thresholdPercent: z.number()
      .min(0, "Percentual não pode ser negativo")
      .max(100, "Percentual não pode exceder 100%")
      .optional()
      .nullable()
      .transform(val => val ?? undefined),
    categoryIds: secureIdArrayValidator.optional().nullable().transform(val => val ?? undefined),
    walletIds: secureIdArrayValidator.optional().nullable().transform(val => val ?? undefined),
    settings: secureJsonValidator.optional().nullable().transform(val => val ?? undefined)
  }),

  update: z.object({
    isEnabled: z.boolean().optional(),
    thresholdAmount: z.number()
      .positive("Valor deve ser positivo")
      .max(1000000, "Valor muito alto")
      .optional()
      .nullable(),
    thresholdPercent: z.number()
      .min(0, "Percentual não pode ser negativo")
      .max(100, "Percentual não pode exceder 100%")
      .optional()
      .nullable(),
    categoryIds: secureIdArrayValidator.optional().nullable(),
    walletIds: secureIdArrayValidator.optional().nullable(),
    settings: secureJsonValidator.optional().nullable()
  })
};

// Função helper para validar e sanitizar dados de entrada
export async function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; errors: string[] }> {
  try {
    const validatedData = await schema.parseAsync(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
      return { success: false, errors };
    }
    return { success: false, errors: ['Erro de validação desconhecido'] };
  }
}

// Middleware para logs de validação
export function logValidationError(
  endpoint: string,
  userId: string | undefined,
  ip: string,
  errors: string[]
) {
  console.warn('Validation Error:', {
    endpoint,
    userId,
    ip,
    errors,
    timestamp: new Date().toISOString()
  });
}

// Detector de tentativas de ataques
export function detectAttackAttempt(input: string): {
  isAttack: boolean;
  attackType: string | null;
  confidence: number;
} {
  const attackPatterns = [
    { pattern: /<script[^>]*>.*?<\/script>/gi, type: 'XSS Script Injection', weight: 0.9 },
    { pattern: /javascript:/gi, type: 'JavaScript Protocol', weight: 0.8 },
    { pattern: /on\w+\s*=\s*["'][^"']*["']/gi, type: 'Event Handler Injection', weight: 0.7 },
    { pattern: /data:\s*text\/html/gi, type: 'Data URI XSS', weight: 0.8 },
    { pattern: /vbscript:/gi, type: 'VBScript Injection', weight: 0.8 },
    { pattern: /<iframe[^>]*>.*?<\/iframe>/gi, type: 'IFrame Injection', weight: 0.6 },
    { pattern: /eval\s*\(/gi, type: 'Code Evaluation', weight: 0.9 },
    { pattern: /document\.cookie/gi, type: 'Cookie Theft', weight: 0.8 }
  ];

  let maxConfidence = 0;
  let detectedType = null;

  for (const { pattern, type, weight } of attackPatterns) {
    if (pattern.test(input)) {
      if (weight > maxConfidence) {
        maxConfidence = weight;
        detectedType = type;
      }
    }
  }

  return {
    isAttack: maxConfidence > 0.5,
    attackType: detectedType,
    confidence: maxConfidence
  };
}