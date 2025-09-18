import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserByApiKeyFromHeader } from '@/lib/apikey';

async function findUserFromSessionOrApiKey(req: NextRequest) {
  // Try API Key first
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const userByKey = await getUserByApiKeyFromHeader(authHeader);
    if (userByKey) return userByKey;
  }
  // Fallback to NextAuth session
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw { status: 401, message: 'Unauthorized' };
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) throw { status: 401, message: 'Unauthorized' };
  return user;
}

export async function GET(req: NextRequest) {
  try {
  const user = await findUserFromSessionOrApiKey(req);
    const [categories, wallets, tags] = await Promise.all([
      prisma.category.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } }),
      prisma.wallet.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } }),
      prisma.tag.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } }),
    ]);

    // Entradas especiais que permitem ao usuário não vincular categoria/tag.
    // Essas entradas não terão `id` e devem aparecer primeiro na lista.
  // Use a clear placeholder flag so clients can detect it easily
  const semCategoria = { name: 'Sem Categoria', placeholder: true };
  const semTag = { name: 'Sem Tag', placeholder: true };

    const categoriesPayload = [semCategoria, ...categories];
    const tagsPayload = [semTag, ...tags];

    return NextResponse.json({ categories: categoriesPayload, wallets, tags: tagsPayload });
  } catch (err: any) {
    const status = err?.status || 500;
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status });
  }
}