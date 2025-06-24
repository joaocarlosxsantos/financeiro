import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import prisma from "@/lib/db"
import { z } from "zod"

const categorySchema = z.object({
  name: z.string().min(1),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const categories = await prisma.category.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
    })
    return NextResponse.json(categories)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = categorySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 })
    }

    const newCategory = await prisma.category.create({
      data: {
        name: parsed.data.name,
        userId: session.user.id,
      },
    })

    return NextResponse.json(newCategory, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
