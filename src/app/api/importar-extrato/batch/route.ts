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
  console.log('🎯 Batch import API called');
  
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    console.log('❌ Authentication failed - no session');
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  
  console.log('✅ User authenticated:', session.user.email);

  try {
    const { batches, carteiraId, processInBackground = true }: BatchImportData = await req.json();

    console.log('📦 Batch request received:', {
      batchesLength: Array.isArray(batches) ? batches.length : 'NOT_ARRAY',
      carteiraId,
      processInBackground,
      firstBatchSample: batches?.[0] ? {
        sourceFile: batches[0].sourceFile,
        registrosLength: batches[0].registros?.length
      } : 'NO_BATCHES'
    });

    if (!Array.isArray(batches) || !carteiraId) {
      console.log('❌ Invalid data:', { batchesIsArray: Array.isArray(batches), carteiraId });
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    // Buscar usuário
    console.log('👤 Looking for user:', session.user.email);
    const user = await prisma.user.findUnique({ 
      where: { email: session.user.email } 
    });
    
    if (!user) {
      console.log('❌ User not found');
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    
    console.log('✅ User found:', user.id);

    // Verificar se a carteira existe e pertence ao usuário
    console.log('💼 Looking for wallet:', carteiraId);
    const wallet = await prisma.wallet.findFirst({
      where: { 
        id: carteiraId, 
        userId: user.id 
      }
    });

    if (!wallet) {
      console.log('❌ Wallet not found');
      return NextResponse.json({ error: 'Carteira não encontrada' }, { status: 404 });
    }
    
    console.log('✅ Wallet found:', wallet.name);

    if (processInBackground) {
      // Processar em background para não travar a interface
      const totalTransactions = batches.reduce((acc, batch) => acc + batch.registros.length, 0);
      
      // Executar em background usando Promise para garantir que execute
      processImportInBackground(user.id, batches, carteiraId).catch(error => {
        console.error('💥 Erro no processamento em background:', error);
      });
      
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
  console.log('🚀 BACKGROUND PROCESS STARTED:', {
    userId,
    carteiraId,
    totalBatches: batches.length,
    totalRecords: batches.reduce((acc, b) => acc + b.registros.length, 0)
  });

  try {
    let totalProcessed = 0;
    const results = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`� Processing batch ${i + 1}/${batches.length}: ${batch.sourceFile}`);
      
      try {
        const result = await processBatch(userId, batch.registros, carteiraId, batch.sourceFile);
        if (result) {
          console.log(`✅ Batch ${i + 1} completed:`, { created: result.created, errors: result.errors.length });
          results.push(result);
          totalProcessed += result.created;
        }
        
        // Pequena pausa entre lotes
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (batchError) {
        console.error(`❌ Batch ${i + 1} failed:`, batchError);
        results.push({ 
          sourceFile: batch.sourceFile, 
          created: 0, 
          errors: [batchError instanceof Error ? batchError.message : 'Unknown error']
        });
      }
    }

    console.log('🎯 BACKGROUND PROCESS COMPLETED:', { totalProcessed });

    // Criar notificação para o usuário
    try {
      await prisma.notification.create({
        data: {
          userId,
          type: 'SYSTEM',
          title: 'Importação Concluída',
          message: `${totalProcessed} transações foram importadas com sucesso`,
          priority: 'HIGH',
          data: {
            totalBatches: batches.length,
            totalProcessed,
            results
          }
        }
      });
      console.log('📬 Success notification created');
    } catch (notificationError) {
      console.error('❌ Failed to create notification:', notificationError);
    }
    
  } catch (error) {
    console.error('💥 CRITICAL ERROR in background process:', error);
    
    // Criar notificação de erro
    try {
      await prisma.notification.create({
        data: {
          userId,
          type: 'SYSTEM',
          title: 'Erro na Importação',
          message: 'Ocorreu um erro durante o processamento em segundo plano',
          priority: 'HIGH',
          data: {
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          }
        }
      });
    } catch (notificationError) {
      console.error('❌ Failed to create error notification:', notificationError);
    }
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
    if (result) {
      results.push(result);
      totalProcessed += result.created;
    }
  }

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
  console.log(`🆔 Processing batch: ${sourceFile} (${registros.length} records)`);

  try {
    // Cache de categorias
    const categoriesCache = await getCategoriesCache(userId);
    
    let created = 0;
    const errors: string[] = [];

    // Processar em lotes muito pequenos para evitar timeout de transação
    const BATCH_SIZE = 5; // Processar apenas 5 registros por vez para evitar timeout
    
    for (let batchStart = 0; batchStart < registros.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, registros.length);
      const batchRegistros = registros.slice(batchStart, batchEnd);
      
      console.log(`Processing sub-batch ${batchStart + 1}-${batchEnd} of ${registros.length}`);
      
      // Processar cada sub-lote em sua própria transação com timeout maior
      const transactionStart = Date.now();
      await prisma.$transaction(async (tx: any) => {      
        for (let idx = 0; idx < batchRegistros.length; idx++) {
          const registro = batchRegistros[idx];
          const recordStart = Date.now();
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
          
          // Prioridade: categoriaId selecionada pelo usuário, senão categoriaRecomendada da IA
          if (!categoryId && registro.categoriaRecomendada && registro.shouldCreateCategory) {
            // Usuário não selecionou nada, usar recomendação da IA
            categoryId = await resolveOrCreateCategory(
              tx, 
              userId, 
              registro.categoriaRecomendada, 
              isIncome ? 'INCOME' : 'EXPENSE',
              categoriesCache
            );
          } else if (!categoryId && registro.categoriaSugerida) {
            // Fallback para categoriaSugerida (sistema antigo)
            categoryId = await resolveOrCreateCategory(
              tx, 
              userId, 
              registro.categoriaSugerida, 
              isIncome ? 'INCOME' : 'EXPENSE',
              categoriesCache
            );
          }

          // Resolver tags (como string array, não relações)
          let tagsArray: string[] = [];
          let tagsToProcess = registro.tags || [];
          
          // Se usuário não definiu tags manualmente, usar recomendações da IA
          if ((!registro.tags || registro.tags.length === 0) && registro.tagsRecomendadas && registro.tagsRecomendadas.length > 0) {
            tagsToProcess = registro.tagsRecomendadas;
          }
          
          if (tagsToProcess && Array.isArray(tagsToProcess)) {
            tagsArray = tagsToProcess.filter(tag => tag && typeof tag === 'string');
          }

          // Criar transação
          if (isIncome) {
            await tx.income.create({
              data: {
                description: registro.descricao || registro.descricaoSimplificada || 'Importado',
                amount,
                date: data,
                type: 'PUNCTUAL',
                userId,
                walletId: carteiraId,
                categoryId: categoryId || null,
                tags: tagsArray
              }
            });
          } else {
            await tx.expense.create({
              data: {
                description: registro.descricao || registro.descricaoSimplificada || 'Importado',
                amount,
                date: data,
                type: 'PUNCTUAL',
                userId,
                walletId: carteiraId,
                categoryId: categoryId || null,
                tags: tagsArray
              }
            });
          }

            created++;
            const recordTime = Date.now() - recordStart;
            console.log(`✅ Record ${batchStart + idx + 1} processed in ${recordTime}ms`);
          
          } catch (recordError) {
            const recordTime = Date.now() - recordStart;
            console.error(`❌ Record ${batchStart + idx + 1} failed after ${recordTime}ms:`, recordError);
            errors.push(`Erro no registro: ${registro.descricao || 'sem descrição'}`);
          }
        }
      }, {
        maxWait: 20000, // 20 segundos de espera máxima
        timeout: 30000, // 30 segundos de timeout
      });
      
      const transactionTime = Date.now() - transactionStart;
      console.log(`⏱️ Transaction for batch ${batchStart + 1}-${batchEnd} completed in ${transactionTime}ms`);
      
      // Pausa maior entre sub-lotes para evitar sobrecarga
      if (batchEnd < registros.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`✅ Batch completed - ${sourceFile}: ${created} created, ${errors.length} errors`);

    return {
      sourceFile,
      created,
      errors
    };
    
  } catch (error) {
    console.error(`💥 Critical error in batch ${sourceFile}:`, error);
    return {
      sourceFile,
      created: 0,
      errors: [`Erro crítico: ${error instanceof Error ? error.message : 'Erro desconhecido'}`]
    };
  }
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