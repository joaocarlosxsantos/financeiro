import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface PeriodCheck {
  startDate: string;
  endDate: string;
  sourceFile?: string;
}

interface BatchImportData {
  batches: Array<{
    registros: any[];
    sourceFile: string;
  }>;
  carteiraId: string;
  saldoAnterior?: number;
  deleteExisting?: boolean;
}

// Função para excluir registros existentes nos períodos
async function deleteExistingRecords(
  userId: string, 
  batches: Array<{ registros: any[]; sourceFile: string }>, 
  carteiraId: string
) {
  function parsePtBrDate(str: string) {
    if (!str) return null;
    const [d, m, y] = str.split('/');
    if (d && m && y) return new Date(Number(y), Number(m) - 1, Number(d));
    const dt = new Date(str);
    return isNaN(dt.getTime()) ? null : dt;
  }

  // Extrair períodos de cada batch
  for (const batch of batches) {
    const validDates = batch.registros
      .map(reg => parsePtBrDate(reg.data))
      .filter(Boolean) as Date[];

    if (validDates.length === 0) continue;

    const startDate = new Date(Math.min(...validDates.map(d => d.getTime())));
    const endDate = new Date(Math.max(...validDates.map(d => d.getTime())));
    
    // Ajustar para fim do dia
    endDate.setHours(23, 59, 59, 999);

    // Excluir incomes no período
    await prisma.income.deleteMany({
      where: {
        userId,
        walletId: carteiraId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Excluir expenses no período
    await prisma.expense.deleteMany({
      where: {
        userId,
        walletId: carteiraId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const { batches, carteiraId, saldoAnterior, deleteExisting }: BatchImportData = await req.json();

    if (!Array.isArray(batches) || !carteiraId) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({ 
      where: { email: session.user.email } 
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 401 });
    }

    // Se deleteExisting for true, excluir registros existentes nos períodos
    if (deleteExisting) {
      await deleteExistingRecords(user.id, batches, carteiraId);
    }

    // Agregar todos os registros de todos os lotes
    const allRegistros = batches.flatMap(batch => 
      batch.registros.map(reg => ({ ...reg, sourceFile: batch.sourceFile }))
    );

    // Processar usando a mesma lógica da importação normal
    const result = await processAllRegistros(user, allRegistros, carteiraId, saldoAnterior);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Erro no import em lote:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Usar exatamente a mesma lógica da importação normal
async function processAllRegistros(user: any, registros: any[], carteiraId: string, saldoAnterior?: number) {
  function parsePtBrDate(str: string) {
    if (!str) return null;
    const [d, m, y] = str.split('/');
    if (d && m && y) return new Date(Number(y), Number(m) - 1, Number(d));
    const dt = new Date(str);
    return isNaN(dt.getTime()) ? null : dt;
  }

  function normalizeNome(nome: string) {
    return nome.trim().toLowerCase();
  }

  // Buscar todas as categorias do usuário uma vez (cache)
  const categoriasExistentes = await prisma.category.findMany({ where: { userId: user.id } });
  const categoriasCache: Record<string, any> = {};
  
  for (const cat of categoriasExistentes) {
    const key = `${normalizeNome(cat.name)}|${cat.type}`;
    categoriasCache[key] = cat;
  }

  // Garantir que a categoria 'Saldo' exista
  let saldoCategoria = categoriasExistentes.find((c: any) => normalizeNome(c.name) === 'saldo' && (c.type === 'BOTH' || c.type === 'INCOME'));
  if (!saldoCategoria) {
    saldoCategoria = await prisma.category.create({
      data: {
        name: 'Saldo',
        type: 'BOTH',
        userId: user.id,
        color: 'rgb(0,128,255)',
      },
    });
    const key = `saldo|BOTH`;
    categoriasCache[key] = saldoCategoria;
  }

  // Buscar tags existentes do usuário
  const tagsExistentes = await prisma.tag.findMany({ 
    where: { userId: user.id },
    select: { id: true, name: true }
  });
  
  // Criar cache de tags para busca rápida
  const tagsCache: Record<string, string> = {};
  for (const tag of tagsExistentes) {
    tagsCache[normalizeNome(tag.name)] = tag.id;
  }

  // Preparar registros finais (mesma lógica da importação normal)
  const registrosFinal = registros.map((reg: any) => {
    let categoriaId = reg.categoriaId;
    let categoriaNome = '';
    
    // Prioridade: categoriaId selecionada pelo usuário, senão categoriaRecomendada da IA
    if (categoriaId && categoriaId.length > 40) {
      // É um ID válido, manter
    } else if (categoriaId && categoriaId.length <= 40) {
      // É um nome de categoria
      categoriaNome = categoriaId;
    } else if (!categoriaId && reg.categoriaRecomendada && reg.shouldCreateCategory) {
      // Usuário não selecionou nada, usar recomendação da IA
      categoriaNome = reg.categoriaRecomendada;
      categoriaId = undefined;
    } else if (!categoriaId && reg.categoriaSugerida) {
      // Fallback para categoriaSugerida (sistema antigo)
      categoriaNome = reg.categoriaSugerida;
    }
    
    categoriaNome = categoriaNome ? normalizeNome(categoriaNome) : '';
    
    // Se for lançamento de saldo inicial, força categoria 'Saldo'
    if (reg.isSaldoInicial || categoriaNome === 'saldo') {
      categoriaId = saldoCategoria.id;
    } else if (categoriaId && categoriaId.length <= 40) {
      // Pode ser nome, resolve para id
      const key = `${normalizeNome(categoriaId)}|INCOME`;
      const key2 = `${normalizeNome(categoriaId)}|EXPENSE`;
      const keyBoth = `${normalizeNome(categoriaId)}|BOTH`;
      categoriaId =
        categoriasCache[key]?.id ||
        categoriasCache[key2]?.id ||
        categoriasCache[keyBoth]?.id ||
        categoriaId;
      // Se não for um id válido, remove
      if (!Object.values(categoriasCache).some((c) => c.id === categoriaId)) {
        categoriaId = undefined;
      }
    }
    
    // Processar tags
    let tagsIds: string[] = [];
    if (reg.tags && reg.tags.length > 0) {
      tagsIds = reg.tags
        .map((tagName: string) => {
          const nomeNorm = normalizeNome(tagName);
          return tagsCache[nomeNorm];
        })
        .filter(Boolean);
    }
    
    return { ...reg, categoriaId, tags: tagsIds };
  });

  // Marcar início da importação em lote para evitar alertas individuais
  const { startBatchImport, endBatchImport } = await import('@/lib/notifications/batchContext');
  startBatchImport(user.id);

  try {
    // Separar lançamentos em incomes e expenses
    const incomes = [];
    const expenses = [];
    
    // Adicionar saldo anterior se informado
    if (saldoAnterior && !isNaN(saldoAnterior) && saldoAnterior !== 0) {
      // Encontrar a data mais antiga dos registros
      const datesFromRegistros = registros
        .map(r => parsePtBrDate(r.data))
        .filter(Boolean) as Date[];
      
      if (datesFromRegistros.length > 0) {
        const earliestDate = new Date(Math.min(...datesFromRegistros.map(d => d.getTime())));
        // Data do saldo: um dia antes da primeira transação  
        const saldoDate = new Date(earliestDate);
        saldoDate.setDate(saldoDate.getDate() - 1);
        
        incomes.push({
          amount: Math.abs(saldoAnterior),
          date: saldoDate,
          description: 'Saldo inicial',
          type: 'PUNCTUAL' as const,
          walletId: carteiraId,
          userId: user.id,
          categoryId: saldoCategoria.id,
          tags: []
        });
      }
    }
    
    for (const reg of registrosFinal) {
      const dataObj = parsePtBrDate(reg.data);
      if (!dataObj) continue;
      
      const base = {
        amount: Math.abs(reg.valor),
        date: dataObj,
        description: reg.descricaoSimplificada || reg.descricao,
        type: 'PUNCTUAL' as const,
        walletId: carteiraId,
        userId: user.id,
        categoryId: reg.categoriaId || undefined,
        tags: reg.tags || [],
      };
      
      if (reg.valor > 0) incomes.push(base);
      else if (reg.valor < 0) expenses.push(base);
    }

    const queries = [];
    if (incomes.length) queries.push(prisma.income.createMany({ data: incomes }));
    if (expenses.length) queries.push(prisma.expense.createMany({ data: expenses }));
    
    if (queries.length) {
      await prisma.$transaction(queries);
    }

    // Processar alertas uma única vez após salvar todas as transações
    try {
      const { processBatchTransactionAlerts } = await import('@/lib/notifications/processor');
      await processBatchTransactionAlerts(user.id, { 
        expenses: expenses.length, 
        incomes: incomes.length 
      });
    } catch (error) {
      console.error('Erro ao processar alertas da importação:', error);
    }

    return { 
      ok: true, 
      imported: { 
        incomes: incomes.length, 
        expenses: expenses.length 
      }
    };
  } finally {
    endBatchImport();
  }
}
