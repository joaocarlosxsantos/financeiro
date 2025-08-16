import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const { registros, carteiraId } = await req.json();
  if (!Array.isArray(registros) || !carteiraId) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }
  function parsePtBrDate(str: string) {
    // Aceita dd/MM/yyyy
    if (!str) return null;
    const [d, m, y] = str.split('/');
    if (d && m && y) return new Date(Number(y), Number(m) - 1, Number(d));
    // fallback para tentar converter direto
    const dt = new Date(str);
    return isNaN(dt.getTime()) ? null : dt;
  }

  // Buscar usuário
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 401 });

  // Busca todas as categorias do usuário uma vez (cache)
  const categoriasExistentes = await prisma.category.findMany({ where: { userId: user.id } });
  const categoriasCache: { [key: string]: any } = {};
  for (const cat of categoriasExistentes) {
    const key = `${cat.name.toLowerCase()}|${cat.type}`;
    categoriasCache[key] = cat;
  }

  // Para criar novas categorias em lote
  const novasCategorias: { name: string, type: 'INCOME' | 'EXPENSE' }[] = [];
  const registrosAtualizados = registros.map(reg => {
    const tipo: 'INCOME' | 'EXPENSE' = reg.valor > 0 ? 'INCOME' : 'EXPENSE';
    let categoriaId = reg.categoriaId;
    let categoriaNome = '';
    if (!categoriaId && reg.categoriaSugerida) {
      categoriaNome = reg.categoriaSugerida;
    } else if (categoriaId && categoriaId.length <= 40) {
      categoriaNome = categoriaId;
    }
    let categoriaObj = null;
    if (categoriaNome) {
      const key = `${categoriaNome.toLowerCase()}|${tipo}`;
      categoriaObj = categoriasCache[key];
      if (!categoriaObj) {
        // Marca para criar depois
        novasCategorias.push({ name: categoriaNome, type: tipo });
      }
    }
    return { ...reg, categoriaId: categoriaObj ? categoriaObj.id : categoriaNome, tipo };
  });

  // Cria novas categorias em lote (evita duplicidade)
  const criadas: any[] = [];
  // Função para gerar cor RGB baseada no nome
  function corPorNome(nome: string) {
    let hash = 0;
    for (let i = 0; i < nome.length; i++) {
      hash = nome.charCodeAt(i) + ((hash << 5) - hash);
    }
    const r = (hash >> 0) & 0xff;
    const g = (hash >> 8) & 0xff;
    const b = (hash >> 16) & 0xff;
    return `rgb(${Math.abs(r)},${Math.abs(g)},${Math.abs(b)})`;
  }

  for (const nova of novasCategorias) {
    // Sempre criar como BOTH e cor baseada no nome
    const key = `${nova.name.toLowerCase()}|BOTH`;
    if (!categoriasCache[key]) {
      const cor = corPorNome(nova.name);
      const cat = await prisma.category.create({
        data: { name: nova.name, type: 'BOTH', userId: user.id, color: cor },
      });
      categoriasCache[key] = cat;
      criadas.push(cat);
    }
  }

  // Salva lançamentos em paralelo
  if (!session?.user?.email) {
    // Não deve acontecer, mas evita erro de tipo
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const userEmail = session.user.email;
  await Promise.all(registrosAtualizados.map(async reg => {
    const dataObj = parsePtBrDate(reg.data);
    if (!dataObj) return;
    let categoriaId = reg.categoriaId;
    if (categoriaId && categoriaId.length <= 40) {
      // Pode ser nome, resolve para id
      const key = `${categoriaId.toLowerCase()}|${reg.tipo}`;
      if (categoriasCache[key]) categoriaId = categoriasCache[key].id;
    }
    if (reg.valor > 0) {
      await prisma.income.create({
        data: {
          amount: reg.valor,
          date: dataObj,
          description: reg.descricaoSimplificada || reg.descricao,
          type: 'VARIABLE',
          wallet: { connect: { id: carteiraId } },
          user: { connect: { email: userEmail } },
          ...(categoriaId ? { category: { connect: { id: categoriaId } } } : {}),
        },
      });
    } else if (reg.valor < 0) {
      await prisma.expense.create({
        data: {
          amount: Math.abs(reg.valor),
          date: dataObj,
          description: reg.descricaoSimplificada || reg.descricao,
          type: 'VARIABLE',
          wallet: { connect: { id: carteiraId } },
          user: { connect: { email: userEmail } },
          ...(categoriaId ? { category: { connect: { id: categoriaId } } } : {}),
        },
      });
    }
  }));
  return NextResponse.json({ ok: true });
}
