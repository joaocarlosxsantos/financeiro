/**
 * Sistema de Webhooks
 * 
 * Dispara webhooks para URLs externas quando eventos ocorrem
 * @module lib/webhooks
 */

import crypto from 'crypto';
import { prisma } from './prisma';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  userId: string;
  data: any;
}

/**
 * Gera assinatura HMAC para validação do webhook
 */
export function generateWebhookSignature(
  payload: string,
  secret: string
): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Valida assinatura de webhook recebido
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Dispara webhooks para um evento específico
 */
export async function triggerWebhooks(
  userId: string,
  event: string,
  data: any
): Promise<void> {
  try {
    // Busca webhooks ativos do usuário que escutam este evento
    const webhooks = await prisma.webhook.findMany({
      where: {
        userId,
        isActive: true,
        events: {
          has: event,
        },
      },
    });

    if (webhooks.length === 0) {
      return;
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      userId,
      data,
    };

    // Dispara todos os webhooks em paralelo
    const promises = webhooks.map((webhook: any) => 
      sendWebhook(webhook.id, webhook.url, webhook.secret, payload)
    );

    await Promise.allSettled(promises);
  } catch (error) {
    console.error('Error triggering webhooks:', error);
  }
}

/**
 * Envia requisição HTTP para webhook
 */
async function sendWebhook(
  webhookId: string,
  url: string,
  secret: string,
  payload: WebhookPayload
): Promise<void> {
  try {
    const payloadString = JSON.stringify(payload);
    const signature = generateWebhookSignature(payloadString, secret);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'User-Agent': 'Financeiro-Webhook/1.0',
      },
      body: payloadString,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (response.ok) {
      // Sucesso
      await prisma.webhook.update({
        where: { id: webhookId },
        data: {
          lastTriggered: new Date(),
          successCount: { increment: 1 },
        },
      });
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.error(`Webhook ${webhookId} failed:`, error);
    
    // Registra falha
    await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        failureCount: { increment: 1 },
      },
    });
  }
}

/**
 * Eventos disponíveis para webhooks
 */
export const WEBHOOK_EVENTS = {
  // Transações
  TRANSACTION_CREATED: 'transaction.created',
  TRANSACTION_UPDATED: 'transaction.updated',
  TRANSACTION_DELETED: 'transaction.deleted',
  
  // Metas
  GOAL_CREATED: 'goal.created',
  GOAL_ACHIEVED: 'goal.achieved',
  GOAL_FAILED: 'goal.failed',
  
  // Alertas
  ALERT_TRIGGERED: 'alert.triggered',
  BUDGET_EXCEEDED: 'budget.exceeded',
  
  // Conquistas
  ACHIEVEMENT_UNLOCKED: 'achievement.unlocked',
  CHALLENGE_COMPLETED: 'challenge.completed',
  
  // Cartões
  CREDIT_BILL_DUE: 'credit.bill.due',
  CREDIT_LIMIT_WARNING: 'credit.limit.warning',
} as const;
