import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { normalizeDescription } from '@/lib/description-normalizer';
import { withUserRateLimit, RATE_LIMITS } from '@/lib/rateLimiter';

/**
 * API para salvar transações de fatura de cartão de crédito
 * POST /api/importar-fatura/salvar
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  // Buscar usuário
  const user = await prisma.user.findUnique({ 
    where: { email: session.user.email },
    select: { id: true }
  });

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 401 });
  }

  // Apply rate limiting
  const rateLimitResponse = await withUserRateLimit(req, user.id, RATE_LIMITS.IMPORT_EXTRACT);
  if (rateLimitResponse) return rateLimitResponse;

  const { registros, creditCardId } = await req.json();

  if (!Array.isArray(registros) || !creditCardId) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  // Verificar se o cartão existe e pertence ao usuário
  const creditCard = await prisma.creditCard.findFirst({
    where: { 
      id: creditCardId,
      userId: user.id 
    }
  });

  if (!creditCard) {
    return NextResponse.json({ error: 'Cartão não encontrado' }, { status: 404 });
  }

  try {
    // Buscar categorias existentes
    const categoriasExistentes = await prisma.category.findMany({ 
      where: { userId: user.id } 
    });

    const categoriasCache: Record<string, any> = {};
    
    for (const cat of categoriasExistentes) {
      const key = `${cat.name.trim().toLowerCase()}|${cat.type}`;
      categoriasCache[key] = cat;
    }

    // Preparar novas categorias e tags
    const novasCategorias: { name: string; type: 'INCOME' | 'EXPENSE' }[] = [];
    const novasTags: string[] = [];

    // Processar cada registro
    const registrosProcessados = registros.map((reg: any) => {
      // Para faturas de cartão, crédito = pagamento (positivo), débito = compra (negativo)
      const tipo: 'INCOME' | 'EXPENSE' = reg.tipo === 'credito' ? 'INCOME' : 'EXPENSE';
      let categoriaId = reg.categoriaId;
      let categoriaNome = '';

      if (categoriaId && categoriaId.length > 40) {
        // É um ID válido
      } else if (categoriaId && categoriaId.length <= 40) {
        // É um nome de categoria
        categoriaNome = categoriaId.trim().toLowerCase();
      } else if (!categoriaId && reg.categoriaSugerida) {
        categoriaNome = reg.categoriaSugerida.trim().toLowerCase();
      }

      let categoriaObj = null;

      if (categoriaNome) {
        const key = `${categoriaNome}|${tipo}`;
        categoriaObj = categoriasCache[key];

        // Criar categoria se não existe
        if (!categoriaObj && categoriaNome && !/^[a-z0-9]{20,}$/.test(categoriaNome)) {
          if (!novasCategorias.some((c) => c.name.toLowerCase() === categoriaNome && c.type === tipo)) {
            novasCategorias.push({ name: categoriaNome, type: tipo });
          }
        }
      }

      // Processar tags
      let tagsFinais = reg.tags || [];
      if ((!reg.tags || reg.tags.length === 0) && reg.tagsRecomendadas && reg.tagsRecomendadas.length > 0) {
        tagsFinais = [...reg.tagsRecomendadas];
        
        for (const tagRecomendada of reg.tagsRecomendadas) {
          if (!novasTags.includes(tagRecomendada)) {
            novasTags.push(tagRecomendada);
          }
        }
      }

      return {
        ...reg,
        categoriaId: categoriaObj ? categoriaObj.id : undefined,
        tipo,
        tags: tagsFinais,
        categoriaNome
      };
    });

    // Criar novas categorias
    const categoriasCriadas: any[] = [];
    for (const novaCat of novasCategorias) {
      const created = await prisma.category.create({
        data: {
          name: novaCat.name,
          type: novaCat.type,
          userId: user.id,
          color: getColorForCategory(novaCat.name),
        },
      });
      categoriasCriadas.push(created);
      const key = `${novaCat.name.toLowerCase()}|${novaCat.type}`;
      categoriasCache[key] = created;
    }

    // Buscar tags existentes
    const tagsExistentes = await prisma.tag.findMany({
      where: { userId: user.id }
    });

    const tagsCache: Record<string, any> = {};
    for (const tag of tagsExistentes) {
      tagsCache[tag.name.toLowerCase()] = tag;
    }

    // Criar novas tags
    const tagsCriadas: any[] = [];
    for (const novaTag of novasTags) {
      if (!tagsCache[novaTag.toLowerCase()]) {
        const created = await prisma.tag.create({
          data: {
            name: novaTag,
            userId: user.id,
          },
        });
        tagsCriadas.push(created);
        tagsCache[novaTag.toLowerCase()] = created;
      }
    }

    // Atualizar categoriaId nos registros com as categorias recém-criadas
    for (const reg of registrosProcessados) {
      if (!reg.categoriaId && reg.categoriaNome) {
        const key = `${reg.categoriaNome}|${reg.tipo}`;
        const cat = categoriasCache[key];
        if (cat) reg.categoriaId = cat.id;
      }
    }

    // Criar transações
    const transacoesCriadas = [];
    
    for (const reg of registrosProcessados) {
      if (!reg.incluir) continue; // Pular se o usuário desmarcou

      const data = new Date(reg.data);
      const valor = Math.abs(reg.valor);
      const descricao = normalizeDescription(reg.descricao || 'Compra cartão');

      // Criar transação
      const transaction = await prisma.transaction.create({
        data: {
          description: descricao,
          amount: valor,
          date: data,
          type: reg.tipo,
          userId: user.id,
          categoryId: reg.categoriaId,
          creditCardId: creditCardId, // Vincular ao cartão
          isPaid: false, // Transações de cartão iniciam como não pagas
        },
      });

      // Vincular tags se houver
      if (reg.tags && reg.tags.length > 0) {
        const tagIds = reg.tags
          .map((tagName: string) => tagsCache[tagName.toLowerCase()]?.id)
          .filter(Boolean);

        if (tagIds.length > 0) {
          await prisma.transactionTag.createMany({
            data: tagIds.map((tagId: string) => ({
              transactionId: transaction.id,
              tagId: tagId,
            })),
            skipDuplicates: true,
          });
        }
      }

      transacoesCriadas.push(transaction);
    }

    return NextResponse.json({
      success: true,
      count: transacoesCriadas.length,
      categoriasCriadas: categoriasCriadas.length,
      tagsCriadas: tagsCriadas.length,
    });

  } catch (error: any) {
    console.error('Erro ao salvar fatura:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar transações', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Gerar cor para categoria
 */
function getColorForCategory(nome: string): string {
  const n = nome.trim().toLowerCase();
  
  // Cores específicas por tipo
  if (n.includes('ifood') || n.includes('uber') || n.includes('99')) return 'rgb(239,68,68)';
  if (n.includes('farmácia') || n.includes('farmacia') || n.includes('drogaria')) return 'rgb(34,197,94)';
  if (n.includes('mercado') || n.includes('supermercado')) return 'rgb(251,191,36)';
  if (n.includes('restaurante') || n.includes('lanchonete')) return 'rgb(249,115,22)';
  if (n.includes('combustível') || n.includes('combustivel') || n.includes('posto')) return 'rgb(6,182,212)';
  if (n.includes('saúde') || n.includes('saude') || n.includes('hospital')) return 'rgb(59,130,246)';
  if (n.includes('educação') || n.includes('educacao') || n.includes('curso')) return 'rgb(139,92,246)';
  if (n.includes('entretenimento') || n.includes('cinema') || n.includes('streaming')) return 'rgb(236,72,153)';
  
  // Cor padrão
  return 'rgb(156,163,175)';
}
