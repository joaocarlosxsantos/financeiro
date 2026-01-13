import { prisma } from './prisma';
import { calculateBillStatus } from './credit-utils';

/**
 * Atualiza automaticamente o status das faturas que deveriam estar como PAID
 * devido a valor zero ou estornos completos
 */
export async function autoUpdateBillStatus(userId?: string) {
  try {
    const where: any = {};
    if (userId) {
      where.userId = userId;
    }

    // Buscar faturas que não estão marcadas como PAID
    const pendingBills = await prisma.creditBill.findMany({
      where: {
        ...where,
        status: {
          not: 'PAID'
        }
      },
      include: {
        creditExpenses: true,
        creditIncomes: true
      }
    });

    const currentDate = new Date();
    const billsToUpdate = [];

    for (const bill of pendingBills) {
      // Calcular total real: despesas - créditos
      const totalExpenses = bill.creditExpenses?.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0) || 0;
      const totalIncomes = bill.creditIncomes?.reduce((sum: number, inc: any) => sum + Number(inc.amount), 0) || 0;
      const calculatedTotal = totalExpenses - totalIncomes;

      const newStatus = calculateBillStatus(
        calculatedTotal,
        Number(bill.paidAmount),
        bill.dueDate,
        currentDate
      );

      // Se deve ser marcada como PAID
      if (newStatus === 'PAID') {
        billsToUpdate.push({
          id: bill.id,
          totalAmount: calculatedTotal,
          status: 'PAID'
        });
      }
    }

    // Atualizar todas as faturas que precisam
    if (billsToUpdate.length > 0) {
      await Promise.all(billsToUpdate.map(bill => 
        prisma.creditBill.update({
          where: { id: bill.id },
          data: { 
            status: bill.status,
            totalAmount: bill.totalAmount
          }
        })
      ));

      console.log(`✅ Auto-marcadas ${billsToUpdate.length} faturas como pagas (valor = 0)`);
      return { updatedCount: billsToUpdate.length, updatedBills: billsToUpdate };
    }

    return { updatedCount: 0, updatedBills: [] };

  } catch (error) {
    console.error('❌ Erro ao atualizar status das faturas automaticamente:', error);
    throw error;
  }
}

/**
 * Executa a atualização automática de status para um usuário específico
 * Pode ser chamada após operações que afetam faturas (estornos, pagamentos, etc.)
 */
export async function triggerBillStatusUpdate(userId: string) {
  return autoUpdateBillStatus(userId);
}

/**
 * Executa a atualização automática para todas as faturas
 * Pode ser usado em um cron job ou processo em background
 */
export async function runGlobalBillStatusUpdate() {
  return autoUpdateBillStatus();
}