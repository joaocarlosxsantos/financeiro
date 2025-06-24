import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import prisma from "@/lib/db"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "desc" },
      include: { category: true },
    })
    return NextResponse.json(transactions)
  } catch (ex) {
    return NextResponse.json({ error: "Erro ao buscar transações", ex}, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { description, amount, categoryId, date } = await req.json()

  if (!description || !amount || !categoryId || !date) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
  }

  try {
    const newTransaction = await prisma.transaction.create({
      data: {
        description,
        amount,
        categoryId,
        date: new Date(date),
        userId: session.user.id,
      },
    })
    return NextResponse.json(newTransaction)
  } catch (ex) {
    return NextResponse.json({ error: "Erro ao criar transação", ex }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id, description, amount, categoryId, date } = await req.json()

  if (!id || !description || !amount || !categoryId || !date) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
  }

  try {
    const updatedTransaction = await prisma.transaction.updateMany({
      where: {
        id,
        userId: session.user.id,
      },
      data: {
        description,
        amount,
        categoryId,
        date: new Date(date),
      },
    })

    if (updatedTransaction.count === 0) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 })
    }

    return NextResponse.json({ message: "Transação atualizada com sucesso" })
  } catch (ex) {
    return NextResponse.json({ error: "Erro ao atualizar transação", ex }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await req.json()
  if (!id) {
    return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })
  }

  try {
    const deletedTransaction = await prisma.transaction.deleteMany({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (deletedTransaction.count === 0) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 })
    }

    return NextResponse.json({ message: "Transação excluída com sucesso" })
  } catch (ex) {
    return NextResponse.json({ error: "Erro ao excluir transação", ex }, { status: 500 })
  }
}
