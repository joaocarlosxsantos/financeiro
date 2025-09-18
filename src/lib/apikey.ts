import { prisma } from '@/lib/prisma';

export async function getUserByApiKeyFromHeader(authorization?: string | null) {
  if (!authorization) return null;
  const m = authorization.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const key = m[1].trim();
  if (!key) return null;
  const user = await prisma.user.findUnique({ where: { apiKey: key } });
  return user || null;
}

export async function revokeApiKeyForUser(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { apiKey: null } });
}

export async function generateApiKeyForUser(userId: string) {
  const crypto = await import('crypto');
  const apiKey = crypto.randomBytes(32).toString('hex');
  await prisma.user.update({ where: { id: userId }, data: { apiKey } });
  return apiKey;
}
