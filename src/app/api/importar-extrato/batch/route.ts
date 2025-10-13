import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Marcar como rota dinâmica
export const dynamic = 'force-dynamic';

interface BatchImportData {
  batches: Array<{
    registros: any[];
    sourceFile: string;
  }>;
  carteiraId: string;
  processInBackground?: boolean;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const { batches, carteiraId, processInBackground = true }: BatchImportData = await req.json();

    if (!Array.isArray(batches) || !carteiraId) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({ 
      where: { email: session.user.email } 
    });
    
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verificar se a carteira existe e pertence ao usuário
    const wallet = await prisma.wallet.findFirst({
      where: { 
        id: carteiraId, 
        userId: user.id 
      }
    });

    if (!wallet) {
      return NextResponse.json({ error: 'Carteira não encontrada' }, { status: 404 });
    }

    if (processInBackground) {
      // Processar em background para não travar a interface
      processImportInBackground(user.id, batches, carteiraId);
      
      const totalTransactions = batches.reduce((acc, batch) => acc + batch.registros.length, 0);
      
      return NextResponse.json({ 
        message: 'Processamento iniciado em segundo plano',
        totalTransactions,
        totalBatches: batches.length
      });
    } else {
      // Processar imediatamente (para casos menores)
      const result = await processImportSync(user.id, batches, carteiraId);
      return NextResponse.json(result);
    }

  } catch (error) {
    console.error('Erro no import em lote:', error);
    return NextResponse.json({ 
      error: 'Erro interno no servidor' 
    }, { status: 500 });
  }
}

// Processamento assíncrono em background
async function processImportInBackground(
  userId: string, 
  batches: Array<{ registros: any[]; sourceFile: string }>, 
  carteiraId: string
) {
  try {
   
    // Processar cada lote sequencialmente para evitar sobrecarga
    let totalProcessed = 0;
    const results = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      try {
        const result = await processBatch(userId, batch.registros, carteiraId, batch.sourceFile);
        results.push(result);
        totalProcessed += result.created;
        
        // Pequena pausa entre lotes para não sobrecarregar o sistema
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (batchError) {
        console.error(`Erro no lote ${i + 1}:`, batchError);
        results.push({ 
          sourceFile: batch.sourceFile, 
          created: 0, 
          error: 'Erro ao processar lote' 
        });
      }
    }

    // Atualizar metas apenas após processar todos os lotes
    await updateGoalsAfterImport(userId);

    
    // Aqui você poderia enviar uma notificação para o usuário
    // via WebSocket ou sistema de notificações
    
  } catch (error) {
    console.error('Erro no processamento em background:', error);
  }
}

// Processamento síncrono
async function processImportSync(
  userId: string, 
  batches: Array<{ registros: any[]; sourceFile: string }>, 
  carteiraId: string
) {
  const results = [];
  let totalProcessed = 0;

  for (const batch of batches) {
    const result = await processBatch(userId, batch.registros, carteiraId, batch.sourceFile);
    results.push(result);
    totalProcessed += result.created;
  }

  // Atualizar metas apenas após processar todos os lotes
  await updateGoalsAfterImport(userId);

  return {
    message: 'Importação concluída',
    totalProcessed,
    batches: results
  };
}

// Processar um lote individual
async function processBatch(
  userId: string, 
  registros: any[], 
  carteiraId: string, 
  sourceFile: string
) {
  // Cache de categorias para evitar múltiplas consultas
  const categoriesCache = await getCategoriesCache(userId);
  const tagsCache = await getTagsCache(userId);
  
  let created = 0;
  const errors: string[] = [];

  // Processar em transação para garantir consistência
  await prisma.$transaction(async (tx: any) => {
    for (const registro of registros) {
      try {
        // Pular saldos iniciais
        if (registro.isSaldoInicial) continue;

        const data = parsePtBrDate(registro.data);
        if (!data) {
          errors.push(`Data inválida: ${registro.data}`);
          continue;
        }

        // Determinar se é receita ou despesa
        const isIncome = registro.valor > 0;
        const amount = Math.abs(registro.valor);

        // Resolver categoria
        let categoryId = registro.categoriaId;
        if (!categoryId && registro.categoriaSugerida) {
          categoryId = await resolveOrCreateCategory(
            tx, 
            userId, 
            registro.categoriaSugerida, 
            isIncome ? 'INCOME' : 'EXPENSE',
            categoriesCache
          );
        }

        // Resolver tags
        const tagIds = [];
        if (registro.tags && Array.isArray(registro.tags)) {
          for (const tagName of registro.tags) {
            const tagId = await resolveOrCreateTag(tx, userId, tagName, tagsCache);
            if (tagId) tagIds.push(tagId);
          }
        }

        // Criar transação
        if (isIncome) {
          await tx.income.create({
            data: {
              description: registro.descricao || registro.descricaoSimplificada || 'Importado',
              amount,
              date: data,
              userId,
              walletId: carteiraId,
              categoryId: categoryId || null,
              tags: tagIds.length > 0 ? {
                connect: tagIds.map(id => ({ id }))
              } : undefined,
              metadata: {
                sourceFile,
                imported: true,
                importedAt: new Date().toISOString()
              }
            }
          });
        } else {
          await tx.expense.create({
            data: {
              description: registro.descricao || registro.descricaoSimplificada || 'Importado',
              amount,
              date: data,
              userId,
              walletId: carteiraId,
              categoryId: categoryId || null,
              tags: tagIds.length > 0 ? {
                connect: tagIds.map(id => ({ id }))
              } : undefined,
              metadata: {
                sourceFile,
                imported: true,
                importedAt: new Date().toISOString()
              }
            }
          });
        }

        created++;
      } catch (recordError) {
        console.error('Erro ao processar registro:', recordError);
        errors.push(`Erro no registro: ${registro.descricao || 'sem descrição'}`);
      }
    }
  });

  return {
    sourceFile,
    created,
    errors
  };
}

// Funções auxiliares
function parsePtBrDate(str: string) {
  if (!str) return null;
  const [d, m, y] = str.split('/');
  if (d && m && y) return new Date(Number(y), Number(m) - 1, Number(d));
  const dt = new Date(str);
  return isNaN(dt.getTime()) ? null : dt;
}

async function getCategoriesCache(userId: string) {
  const categories = await prisma.category.findMany({ 
    where: { userId } 
  });
  
  const cache: Record<string, any> = {};
  for (const cat of categories) {
    const key = `${cat.name.trim().toLowerCase()}|${cat.type}`;
    cache[key] = cat;
  }
  
  return cache;
}

async function getTagsCache(userId: string) {
  const tags = await prisma.tag.findMany({ 
    where: { userId } 
  });
  
  const cache: Record<string, any> = {};
  for (const tag of tags) {
    cache[tag.name.trim().toLowerCase()] = tag;
  }
  
  return cache;
}

async function resolveOrCreateCategory(
  tx: any, 
  userId: string, 
  categoryName: string, 
  type: 'INCOME' | 'EXPENSE',
  cache: Record<string, any>
) {
  const key = `${categoryName.trim().toLowerCase()}|${type}`;
  
  if (cache[key]) {
    return cache[key].id;
  }

  // Criar nova categoria
  const newCategory = await tx.category.create({
    data: {
      name: categoryName.trim(),
      type,
      userId
    }
  });

  cache[key] = newCategory;
  return newCategory.id;
}

async function resolveOrCreateTag(
  tx: any, 
  userId: string, 
  tagName: string,
  cache: Record<string, any>
) {
  const key = tagName.trim().toLowerCase();
  
  if (cache[key]) {
    return cache[key].id;
  }

  // Criar nova tag
  const newTag = await tx.tag.create({
    data: {
      name: tagName.trim(),
      userId
    }
  });

  cache[key] = newTag;  
  return newTag.id;
}

async function updateGoalsAfterImport(userId: string) {
  try {
    // Aqui você implementaria a lógica para recalcular as metas
    // Por exemplo, verificar se alguma meta foi atingida, atualizar progresso, etc.
    
    
    // Exemplo: buscar metas ativas e recalcular progresso
    const activeGoals = await prisma.goal.findMany({
      where: { 
        userId,
        status: 'ACTIVE'
      }
    });

    for (const goal of activeGoals) {
      // Lógica específica para cada tipo de meta
      // Isso dependeria da estrutura das suas metas
      
      // Exemplo básico:
      if (goal.type === 'SAVINGS') {
        // Calcular total economizado baseado nas transações
        // Atualizar progresso da meta
      }
    }
    
  } catch (error) {
    console.error('Erro ao atualizar metas:', error);
  }
}