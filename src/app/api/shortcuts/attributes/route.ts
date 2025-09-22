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
    // read optional query param `type`: 'gasto' | 'ganho'
    const url = new URL(req.url);
    const typeParam = url.searchParams.get('type');

    // Build a where clause for categories based on the type param
    // Our DB enum values are: EXPENSE, INCOME, BOTH
    let categoryWhere: any = { userId: user.id };
    if (typeParam === 'gasto') {
      categoryWhere.AND = [{ userId: user.id }, { OR: [{ type: 'EXPENSE' }, { type: 'BOTH' }] }];
    } else if (typeParam === 'ganho') {
      categoryWhere.AND = [{ userId: user.id }, { OR: [{ type: 'INCOME' }, { type: 'BOTH' }] }];
    }

    type CategoryRow = { id: string; name: string };
    type TagRow = { id: string; name: string };
    type WalletRow = { id: string; name: string };

    const [categoriesRaw, wallets, tagsRaw]: [CategoryRow[], WalletRow[], TagRow[]] = await Promise.all([
      prisma.category.findMany({ where: categoryWhere, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
      prisma.wallet.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
      prisma.tag.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    ]);

    // Placeholders that the client (Shortcuts) can detect easily.
    const semCategoria = { id: 'no-category', name: 'Sem categoria' };
    const semTag = { id: 'no-tag', name: 'Sem tag' };

    // Return only id and name for categories and tags, and include placeholders first
  const categoriesPayload = [semCategoria, ...categoriesRaw.map((c: CategoryRow) => ({ id: c.id, name: c.name }))];
  const tagsPayload = [semTag, ...tagsRaw.map((t: TagRow) => ({ id: t.id, name: t.name }))];

    return NextResponse.json({ categories: categoriesPayload, wallets, tags: tagsPayload });
  } catch (err: any) {
    const status = err?.status || 500;
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status });
  }
}