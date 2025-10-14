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
  // registros: array de lançamentos extraídos do extrato (esperamos objetos com campos definidos)
  type ImportRow = { 
    data: string; 
    valor: number; 
    categoriaId?: string; 
    categoriaSugerida?: string; 
    categoriaRecomendada?: string; // Categoria sugerida pela IA
    shouldCreateCategory?: boolean; // Se deve criar a categoria recomendada
    tagsRecomendadas?: string[]; // Tags sugeridas pela IA
    descricao?: string; 
    descricaoSimplificada?: string; 
    isSaldoInicial?: boolean;
    tags?: string[]; // Tags selecionadas pelo usuário ou recomendadas pela IA
  };
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
  type PrismaCategory = Awaited<ReturnType<typeof prisma.category.findMany>>[number];
  const categoriasCache: Record<string, PrismaCategory> = {};
  function normalizeNome(nome: string) {
    return nome.trim().toLowerCase();
  }
  for (const cat of categoriasExistentes) {
    const key = `${normalizeNome(cat.name)}|${cat.type}`;
    categoriasCache[key] = cat;
  }

  // Garante que a categoria 'Saldo' exista (type BOTH ou INCOME)
  let saldoCategoria = categoriasExistentes.find((c: PrismaCategory) => normalizeNome(c.name) === 'saldo' && (c.type === 'BOTH' || c.type === 'INCOME'));
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

  // Para criar novas categorias e tags em lote
  const novasCategorias: { name: string; type: 'INCOME' | 'EXPENSE' }[] = [];
  const novasTags: string[] = [];
  
  const registrosAtualizados = registros.map((reg) => {
    const tipo: 'INCOME' | 'EXPENSE' = reg.valor > 0 ? 'INCOME' : 'EXPENSE';
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
      categoriaId = undefined; // Será definido após criação
    } else if (!categoriaId && reg.categoriaSugerida) {
      // Fallback para categoriaSugerida (sistema antigo)
      categoriaNome = reg.categoriaSugerida;
    }
    
    categoriaNome = categoriaNome ? normalizeNome(categoriaNome) : '';
    let categoriaObj = null;
    
    // Se for lançamento de saldo inicial, força categoria 'Saldo'
    if (reg.isSaldoInicial || categoriaNome === 'saldo') {
      categoriaObj = saldoCategoria;
      categoriaNome = 'saldo';
      categoriaId = saldoCategoria.id;
    } else if (categoriaNome) {
      const key = `${categoriaNome}|${tipo}`;
      categoriaObj = categoriasCache[key];
      
      // Só cria categoria se o nome for válido (não id, não vazio, não string aleatória)
      const isProvavelId = /^[a-z0-9]{20,}$/.test(categoriaNome);
      if (
        !categoriaObj &&
        categoriaNome &&
        !isProvavelId &&
        categoriaNome !== '' &&
        categoriaNome !== undefined
      ) {
        if (
          !novasCategorias.some((c) => normalizeNome(c.name) === categoriaNome && c.type === tipo)
        ) {
          novasCategorias.push({ name: categoriaNome, type: tipo });
        }
      }
    }
    
    // Processar tags recomendadas pela IA se o usuário não definiu tags manualmente
    let tagsFinais = reg.tags || [];
    if ((!reg.tags || reg.tags.length === 0) && reg.tagsRecomendadas && reg.tagsRecomendadas.length > 0) {
      // Usuário não definiu tags, usar recomendações da IA
      tagsFinais = [...reg.tagsRecomendadas];
      
      // Adicionar tags que precisam ser criadas à lista de novas tags
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
      tags: tagsFinais
    };
  });

  // Cria novas categorias em lote (evita duplicidade)
  const criadas: PrismaCategory[] = [];
  // Função para cor fixa por sugestão de categoria
  function corFixaCategoria(nome: string) {
    const n = nome.trim().toLowerCase();
    if (n.includes('ifood')) return 'rgb(220,38,38)'; // vermelho
    if (n.includes('uber')) return 'rgb(16,185,129)'; // verde água
    if (n.includes('farm')) return 'rgb(34,197,94)'; // verde
    if (n.includes('mercado') || n.includes('supermercado')) return 'rgb(251,191,36)'; // amarelo
    if (n.includes('academia')) return 'rgb(59,130,246)'; // azul
    if (n.includes('pet')) return 'rgb(168,85,247)'; // roxo
    if (n.includes('aluguel')) return 'rgb(245,158,11)'; // laranja
    if (n.includes('energia')) return 'rgb(251,113,133)'; // rosa
    if (n.includes('água') || n.includes('agua')) return 'rgb(56,189,248)'; // azul claro
    if (n.includes('internet')) return 'rgb(99,102,241)'; // azul escuro
    if (n.includes('luz')) return 'rgb(253,224,71)'; // amarelo claro
    if (n.includes('combust')) return 'rgb(239,68,68)'; // vermelho escuro
    if (n.includes('restaurante')) return 'rgb(251,113,133)'; // rosa
    if (n.includes('salário') || n.includes('salario')) return 'rgb(34,197,94)'; // verde
    if (n.includes('dinheiro')) return 'rgb(34,197,94)'; // verde
    if (n.includes('pix')) return 'rgb(59,130,246)'; // azul
    if (n.includes('saúde') || n.includes('saude')) return 'rgb(168,85,247)'; // roxo
    return null;
  }

  // Função para gerar cor RGB baseada no nome (fallback)
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

  // Criar novas categorias em lote
  for (const nova of novasCategorias) {
    const nomeNorm = normalizeNome(nova.name);
    const key = `${nomeNorm}|BOTH`;
    if (!categoriasCache[key]) {
      const cor = corFixaCategoria(nova.name) || corPorNome(nova.name);
      const cat = await prisma.category.create({
        data: { name: nova.name, type: 'BOTH', userId: user.id, color: cor },
      });
      categoriasCache[key] = cat;
      criadas.push(cat as any);
      
      // Associar categoria criada aos registros correspondentes
      for (const reg of registrosAtualizados) {
        let categoriaNome = '';
        if (reg.categoriaRecomendada) {
          categoriaNome = normalizeNome(reg.categoriaRecomendada);
        } else if (reg.categoriaSugerida) {
          categoriaNome = normalizeNome(reg.categoriaSugerida);
        } else if (reg.categoriaId && reg.categoriaId.length <= 40) {
          categoriaNome = normalizeNome(reg.categoriaId);
        }
        if (categoriaNome === nomeNorm) {
          reg.categoriaId = cat.id;
        }
      }
    }
  }

  // Buscar tags existentes do usuário
  const tagsExistentes = await prisma.tag.findMany({ 
    where: { userId: user.id },
    select: { id: true, name: true }
  });
  
  // Criar cache de tags para busca rápida
  const tagsCache: Record<string, string> = {}; // nome -> id
  for (const tag of tagsExistentes) {
    tagsCache[normalizeNome(tag.name)] = tag.id;
  }
  
  // Criar novas tags em lote
  const tagsCriadas: Record<string, string> = {}; // nome -> id
  for (const nomeTag of novasTags) {
    const nomeNorm = normalizeNome(nomeTag);
    if (!tagsCache[nomeNorm] && !tagsCriadas[nomeNorm]) {
      const tag = await prisma.tag.create({
        data: { name: nomeTag, userId: user.id }
      });
      tagsCriadas[nomeNorm] = tag.id;
      tagsCache[nomeNorm] = tag.id; // Adicionar ao cache também
    }
  }

  // Atualiza os registros com os ids corretos das categorias e tags criadas
  const registrosFinal = (registrosAtualizados as ImportRow[]).map((reg) => {
    let categoriaId = reg.categoriaId;
    
    // Processar categoria
    let categoriaNome = '';
    if (reg.categoriaRecomendada) {
      categoriaNome = normalizeNome(reg.categoriaRecomendada);
    } else if (reg.categoriaSugerida) {
      categoriaNome = normalizeNome(reg.categoriaSugerida);
    } else if (categoriaId && categoriaId.length <= 40) {
      categoriaNome = normalizeNome(categoriaId);
    }
    
    // Se for saldo inicial, sempre força o id da categoria Saldo
    if (reg.isSaldoInicial || categoriaNome === 'saldo') {
      const catSaldo = Object.values(categoriasCache).find(
        (c) => normalizeNome(c.name) === 'saldo',
      );
      if (catSaldo) categoriaId = catSaldo.id;
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
      // Se não for um id válido (não está no cache), remove
      if (!Object.values(categoriasCache).some((c) => c.id === categoriaId)) {
        categoriaId = undefined;
      }
    }
    
    // Processar tags - converter nomes para IDs
    let tagsIds: string[] = [];
    if (reg.tags && reg.tags.length > 0) {
      tagsIds = reg.tags
        .map(tagName => {
          const nomeNorm = normalizeNome(tagName);
          return tagsCache[nomeNorm];
        })
        .filter(Boolean); // Remove tags não encontradas
    }
    
    return { ...reg, categoriaId, tags: tagsIds };
  });

  // Salva lançamentos em transação atômica
  if (!session?.user?.email) {
    // Não deve acontecer, mas evita erro de tipo
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const userEmail = session.user.email;
  try {
    // Marcar início da importação em lote para evitar alertas individuais
    const { startBatchImport, endBatchImport } = await import('@/lib/notifications/batchContext');
    startBatchImport(user.id);

    try {
      // Separar lançamentos em incomes e expenses
      const incomes = [];
      const expenses = [];
      for (const reg of registrosFinal) {
        const dataObj = parsePtBrDate(reg.data);
        if (!dataObj) throw new Error('Data inválida em um dos lançamentos');
        let categoriaId = reg.categoriaId;
        const base = {
          amount: Math.abs(reg.valor),
          date: dataObj,
          description: reg.descricaoSimplificada || reg.descricao,
          type: 'PUNCTUAL' as const,
          walletId: carteiraId,
          userId: user.id,
          categoryId: categoriaId || undefined,
          tags: reg.tags || [], // Suporte para múltiplas tags
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
        // Não falhar a importação se houver erro nos alertas
      }

      return NextResponse.json({ 
        ok: true, 
        imported: { 
          incomes: incomes.length, 
          expenses: expenses.length 
        }
      });
    } finally {
      // Sempre finalizar contexto de importação em lote, mesmo em caso de erro
      endBatchImport();
    }
  } catch (err: unknown) {
    const msg = err && typeof err === 'object' && 'message' in err ? (err as any).message : String(err);
    return NextResponse.json({ error: msg || 'Erro ao salvar lançamentos' }, { status: 500 });
  }
}
