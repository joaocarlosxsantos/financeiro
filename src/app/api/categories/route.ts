import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const categories = await prisma.category.findMany({
    where: { userId: user.id },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(categories)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, color = '#3B82F6', type = 'EXPENSE', icon } = await req.json()
  if (!name || !type) {
    return NextResponse.json({ error: 'Nome e tipo são obrigatórios' }, { status: 400 })
  }

  try {
    const category = await prisma.category.create({
      data: { name, color, type, icon, userId: user.id },
    })
    return NextResponse.json(category, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro ao criar categoria' }, { status: 500 })
  }
}


