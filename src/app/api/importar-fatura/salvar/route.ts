import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { normalizeDescription } from '@/lib/description-normalizer';
import { withUserRateLimit, RATE_LIMITS } from '@/lib/rateLimiter';
import { calculateInstallmentDates, getBillPeriodForInstallment, calculateClosingDate, calculateDueDate, type CreditCard } from '@/lib/credit-utils';

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

  const { registros, creditCardId, billPeriod, deleteExisting } = await req.json();

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
    // Se o usuário confirmou a exclusão, excluir faturas existentes
    if (deleteExisting && billPeriod && billPeriod.year && billPeriod.month) {
      console.log('🗑️ Excluindo faturas existentes para o período:', billPeriod);
      
      // Calcular as datas de fechamento e vencimento para o período especificado
      // IMPORTANTE: billPeriod.month está em formato 1-based (1-12), então subtraímos 1
      const closingDate = calculateClosingDate(creditCard as any, billPeriod.year, billPeriod.month - 1);
      const dueDate = calculateDueDate(creditCard as any, billPeriod.year, billPeriod.month - 1);
      
      console.log('📅 Datas calculadas:', {
        closingDate: closingDate.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0]
      });

      // Buscar fatura existente para este período
      const existingBill = await prisma.creditBill.findFirst({
        where: {
          creditCardId: creditCardId,
          userId: user.id,
          closingDate: closingDate,
        },
        include: {
          creditExpenses: true,
          creditIncomes: true,
        }
      });

      if (existingBill) {
        console.log('⚠️ Fatura existente encontrada. Excluindo...', {
          billId: existingBill.id,
          expenses: existingBill.creditExpenses.length,
          incomes: existingBill.creditIncomes.length
        });

        // Excluir os registros vinculados à fatura (expenses e incomes)
        // As relações têm onDelete: SetNull, então precisamos excluir manualmente
        await prisma.creditExpense.deleteMany({
          where: { creditBillId: existingBill.id }
        });

        await prisma.creditIncome.deleteMany({
          where: { creditBillId: existingBill.id }
        });

        // Excluir a fatura
        await prisma.creditBill.delete({
          where: { id: existingBill.id }
        });

        console.log('✅ Fatura e registros excluídos com sucesso');
      } else {
        console.log('ℹ️ Nenhuma fatura existente encontrada para este período');
      }
    }

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
    const registrosProcessados = registros
      .map((reg: any) => {
      // Valores negativos são créditos (estornos/pagamentos) que liberam limite
      // Valores positivos são despesas que consomem limite
      const valorOriginal = typeof reg.valor === 'number' ? reg.valor : parseFloat(reg.valor) || 0;
      const isCredito = valorOriginal < 0;
      const tipo: 'INCOME' | 'EXPENSE' = isCredito ? 'INCOME' : 'EXPENSE';
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
        categoriaNome,
        isCredito, // Flag para indicar que é um crédito
        valorOriginal, // Preservar o valor original com sinal
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

    // Criar transações e associar às faturas
    const despesasCriadas: any[] = [];
    const creditosCriados: any[] = []; // Créditos são gravados como CreditIncome
    const billsMap = new Map<string, { year: number; month: number; expenses: any[]; incomes: any[] }>();
    
    for (const reg of registrosProcessados) {
      if (!reg.incluir) continue; // Pular se o usuário desmarcou

      // Criar data no fuso horário local (meio-dia para evitar problemas de timezone)
      const [year, month, day] = reg.data.split('-').map(Number);
      const data = new Date(year, month - 1, day, 12, 0, 0);
      
      const valor = Math.abs(reg.valorOriginal); // Sempre positivo para armazenar
      const descricao = normalizeDescription(reg.descricao || (reg.isCredito ? 'Crédito/Estorno' : 'Compra cartão'));

      // Converter nomes de tags para IDs
      const tagIds: string[] = [];
      if (reg.tags && reg.tags.length > 0) {
        for (const tagName of reg.tags) {
          const tag = tagsCache[tagName.toLowerCase()];
          if (tag) {
            tagIds.push(tag.id);
          }
        }
      }

      if (reg.isCredito) {
        // Crédito/Estorno - cria CreditIncome vinculado à fatura
        let targetBillPeriod;
        let isOutsidePeriod = false;
        let calculatedBillPeriod = null;
        
        if (billPeriod) {
          // Usuário especificou a fatura - usar sempre o período escolhido
          targetBillPeriod = billPeriod;
          
          // Calcular qual seria o período correto para detectar antecipações
          const cardData: CreditCard = {
            id: creditCard.id,
            name: creditCard.name,
            dueDay: creditCard.dueDay,
            closingDay: creditCard.closingDay,
          };
          
          const installmentDates = calculateInstallmentDates(cardData, data, 1, valor);
          const installmentDate = installmentDates[0];
          calculatedBillPeriod = getBillPeriodForInstallment(cardData, installmentDate.dueDate);
          
          // Verifica se está fora do período para adicionar observação
          if (calculatedBillPeriod.year !== billPeriod.year || calculatedBillPeriod.month !== billPeriod.month) {
            isOutsidePeriod = true;
          }
        } else {
          // Modo legado: calcular automaticamente qual fatura
          const cardData: CreditCard = {
            id: creditCard.id,
            name: creditCard.name,
            dueDay: creditCard.dueDay,
            closingDay: creditCard.closingDay,
          };
          
          const installmentDates = calculateInstallmentDates(cardData, data, 1, valor);
          const installmentDate = installmentDates[0];
          targetBillPeriod = getBillPeriodForInstallment(cardData, installmentDate.dueDate);
        }
        
        const billKey = `${targetBillPeriod.year}-${targetBillPeriod.month}`;


        // Agrupar por período de fatura
        if (!billsMap.has(billKey)) {
          billsMap.set(billKey, {
            year: targetBillPeriod.year,
            month: targetBillPeriod.month,
            expenses: [],
            incomes: [],
          });
        }

        // Adicionar observação se estiver fora do período
        let observacao = '';
        if (isOutsidePeriod && calculatedBillPeriod) {
          observacao = ` [Antecipado da fatura ${calculatedBillPeriod.month}/${calculatedBillPeriod.year}]`;
        }

        // Armazenar crédito para criar depois com billId
        billsMap.get(billKey)!.incomes.push({
          description: descricao + observacao,
          amount: valor,
          date: data,
          categoryId: reg.categoriaId || null,
          tags: tagIds,
        });
        
        continue;
      }

      // Se billPeriod foi fornecido pelo usuário, usar direto
      // Caso contrário, calcular automaticamente
      let targetBillPeriod;
      let isOutsidePeriod = false;
      let calculatedBillPeriod = null;
      
      if (billPeriod) {
        // Usuário especificou a fatura - usar sempre o período escolhido
        targetBillPeriod = billPeriod;
        
        // Calcular qual seria o período correto para detectar antecipações
        const cardData: CreditCard = {
          id: creditCard.id,
          name: creditCard.name,
          dueDay: creditCard.dueDay,
          closingDay: creditCard.closingDay,
        };
        
        const installmentDates = calculateInstallmentDates(cardData, data, 1, valor);
        const installmentDate = installmentDates[0];
        calculatedBillPeriod = getBillPeriodForInstallment(cardData, installmentDate.dueDate);
        
        // Verifica se está fora do período para adicionar observação
        if (calculatedBillPeriod.year !== billPeriod.year || calculatedBillPeriod.month !== billPeriod.month) {
          isOutsidePeriod = true;
        }
      } else {
        // Modo legado: calcular automaticamente qual fatura
        const cardData: CreditCard = {
          id: creditCard.id,
          name: creditCard.name,
          dueDay: creditCard.dueDay,
          closingDay: creditCard.closingDay,
        };
        
        const installmentDates = calculateInstallmentDates(cardData, data, 1, valor);
        const installmentDate = installmentDates[0];
        targetBillPeriod = getBillPeriodForInstallment(cardData, installmentDate.dueDate);
      }
      
      const billKey = `${targetBillPeriod.year}-${targetBillPeriod.month}`;

      // Agrupar por período de fatura
      if (!billsMap.has(billKey)) {
        billsMap.set(billKey, {
          year: targetBillPeriod.year,
          month: targetBillPeriod.month,
          expenses: [],
          incomes: [],
        });
      }

      // Adicionar observação se estiver fora do período
      let observacao = '';
      if (isOutsidePeriod && calculatedBillPeriod) {
        observacao = ` [Antecipado da fatura ${calculatedBillPeriod.month}/${calculatedBillPeriod.year}]`;
      }

      // Armazenar info temporária para criar depois com billId
      billsMap.get(billKey)!.expenses.push({
        description: descricao + observacao,
        amount: valor,
        purchaseDate: data,
        categoryId: reg.categoriaId || null,
        tags: tagIds,
      });
    }

    // Criar ou atualizar as faturas para cada período
    const billsCreated = [];
    
    for (const billKey of Array.from(billsMap.keys())) {
      const billData = billsMap.get(billKey)!;
      
      // Calcular datas da fatura baseado no período escolhido
      // IMPORTANTE: As funções calculateClosingDate/calculateDueDate esperam month 0-based (0-11)
      // Mas billData.month está em formato 1-based (1-12), então subtraímos 1
      const closingDate = calculateClosingDate(creditCard as any, billData.year, billData.month - 1);
      const dueDate = calculateDueDate(creditCard as any, billData.year, billData.month - 1);
      
      // Calcular total: despesas - créditos
      const totalExpenses = billData.expenses.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0);
      const totalIncomes = billData.incomes.reduce((sum: number, inc: any) => sum + Number(inc.amount), 0);
      const totalAmount = totalExpenses - totalIncomes;

      // Verificar se a fatura já existe
      let bill = await prisma.creditBill.findFirst({
        where: {
          creditCardId: creditCardId,
          closingDate: closingDate,
          userId: user.id,
        },
      });

      if (!bill) {
        // Criar nova fatura
        bill = await prisma.creditBill.create({
          data: {
            userId: user.id,
            creditCardId: creditCardId,
            closingDate: closingDate,
            dueDate: dueDate,
            totalAmount: totalAmount,
            paidAmount: 0,
            status: 'PENDING',
          },
        });
        billsCreated.push(bill);
      } else {
        // Atualizar o valor total da fatura existente
        const newTotal = Number(bill.totalAmount) + totalAmount;
        bill = await prisma.creditBill.update({
          where: { id: bill.id },
          data: { totalAmount: newTotal },
        });
      }

      // Criar os CreditExpense vinculados diretamente à fatura
      for (const expenseData of billData.expenses) {
        const creditExpense = await prisma.creditExpense.create({
          data: {
            description: expenseData.description,
            amount: expenseData.amount,
            purchaseDate: expenseData.purchaseDate,
            installments: 1,
            type: 'EXPENSE',
            userId: user.id,
            categoryId: expenseData.categoryId,
            creditCardId: creditCardId,
            creditBillId: bill.id,
            tags: expenseData.tags,
          },
        });

        despesasCriadas.push(creditExpense);
      }

      // Criar os CreditIncome vinculados diretamente à fatura
      for (const incomeData of billData.incomes) {
        const creditIncome = await prisma.creditIncome.create({
          data: {
            description: incomeData.description,
            amount: incomeData.amount,
            date: incomeData.date,
            userId: user.id,
            categoryId: incomeData.categoryId,
            creditCardId: creditCardId,
            creditBillId: bill.id,
            tags: incomeData.tags,
          },
        });

        creditosCriados.push(creditIncome);
      }
    }

    // Registrar totais importados (não precisa mais atualizar availableCredit)
    const totalDespesas = despesasCriadas.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const totalCreditos = creditosCriados.reduce((sum, exp) => sum + Number(exp.amount), 0);
    
    return NextResponse.json({
      success: true,
      count: despesasCriadas.length + creditosCriados.length,
      despesas: despesasCriadas.length,
      creditos: creditosCriados.length,
      billsCreated: billsCreated.length,
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
