
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export async function GET() {
  const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(tags);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const tagSchema = z.object({
    name: z.string().min(1, 'Nome obrigatório'),
  });
  const parse = tagSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues.map(e => e.message).join(', ') }, { status: 400 });
  }
  const { name } = parse.data;
  const tag = await prisma.tag.create({ data: { name } });
  return NextResponse.json(tag);
}
