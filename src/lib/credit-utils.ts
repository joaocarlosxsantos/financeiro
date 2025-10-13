/**
 * Utilitários para sistema de crédito
 * Funções para calcular datas de vencimento, fechamento de faturas, etc.
 */

export interface CreditCard {
  id: string;
  name: string;
  bankId?: string;
  brand?: string;
  limit?: number;
  dueDay: number;
  closingDay: number;
  paymentType?: string;
}

export interface InstallmentInfo {
  installment: number;
  totalInstallments: number;
  value: number;
  dueDate: Date;
}

/**
 * Calcula as datas de vencimento das parcelas baseado no cartão de crédito
 */
export function calculateInstallmentDates(
  creditCard: CreditCard,
  purchaseDate: Date,
  installmentCount: number,
  totalAmount: number
): InstallmentInfo[] {
  const installments: InstallmentInfo[] = [];
  const installmentAmount = Math.round((totalAmount / installmentCount) * 100) / 100;
  
  // Calcular se a compra foi antes ou depois do fechamento do mês atual
  const purchaseDay = purchaseDate.getDate();
  const isAfterClosing = purchaseDay > creditCard.closingDay;
  
  for (let i = 0; i < installmentCount; i++) {
    // Calcular o mês da parcela
    let targetMonth = new Date(purchaseDate);
    
    // Se foi após o fechamento, a primeira parcela vai para o próximo mês
    // Caso contrário, vai para o mês atual
    const monthsToAdd = isAfterClosing ? i + 1 : i;
    targetMonth.setMonth(targetMonth.getMonth() + monthsToAdd);
    
    // Definir o dia de vencimento da fatura
    const dueDate = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth(),
      creditCard.dueDay
    );
    
    // Ajustar o valor da última parcela para compensar arredondamentos
    const amount = i === installmentCount - 1 
      ? totalAmount - (installmentAmount * (installmentCount - 1))
      : installmentAmount;
    
    installments.push({
      installment: i + 1,
      totalInstallments: installmentCount,
      value: amount,
      dueDate: dueDate
    });
  }
  return installments;
}

/**
 * Calcula a data de fechamento de uma fatura para um mês específico
 */
export function calculateClosingDate(creditCard: CreditCard, year: number, month: number): Date {
  const closingDate = new Date(year, month, creditCard.closingDay);
  
  // Se o dia de fechamento for maior que os dias do mês, usar o último dia
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  if (creditCard.closingDay > lastDayOfMonth) {
    closingDate.setDate(lastDayOfMonth);
  }
  
  return closingDate;
}

/**
 * Calcula a data de vencimento de uma fatura para um mês específico
 */
export function calculateDueDate(creditCard: CreditCard, year: number, month: number): Date {
  // A data de vencimento é no mesmo mês do fechamento
  const dueDate = new Date(year, month, creditCard.dueDay);
  
  // Se o dia de vencimento for maior que os dias do mês, usar o último dia
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  if (creditCard.dueDay > lastDayOfMonth) {
    dueDate.setDate(lastDayOfMonth);
  }
  
  return dueDate;
}

/**
 * Determina em qual fatura uma parcela deve ser incluída
 */
export function getBillPeriodForInstallment(
  creditCard: CreditCard,
  installmentDueDate: Date
): { year: number; month: number } {
  // A parcela pertence à fatura do mesmo mês do vencimento
  // Se vence dia 7 de novembro, pertence à fatura que fecha dia 1 de novembro
  const billMonth = installmentDueDate.getMonth();
  const billYear = installmentDueDate.getFullYear();
  
  return {
    year: billYear,
    month: billMonth
  };
}

/**
 * Formata o número da parcela para exibição
 */
export function formatInstallmentDisplay(
  installmentNumber: number,
  totalInstallments: number
): string {
  if (totalInstallments === 1) {
    return 'À vista';
  }
  return `${installmentNumber}/${totalInstallments}`;
}

/**
 * Calcula o status de uma fatura baseado nas datas e valores
 */
export function calculateBillStatus(
  totalAmount: number,
  paidAmount: number,
  dueDate: Date,
  currentDate: Date = new Date()
): 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE' {
  // Se o valor total é zero ou negativo, a fatura está quitada
  if (totalAmount <= 0) {
    return 'PAID';
  }
  
  // Se o valor pago é maior ou igual ao total, está paga
  if (paidAmount >= totalAmount) {
    return 'PAID';
  }
  
  // Se há pagamento parcial
  if (paidAmount > 0) {
    return currentDate > dueDate ? 'OVERDUE' : 'PARTIAL';
  }
  
  // Sem pagamento
  return currentDate > dueDate ? 'OVERDUE' : 'PENDING';
}

/**
 * Verifica se é necessário criar uma nova fatura para um cartão
 */
export function shouldCreateNewBill(
  creditCard: CreditCard,
  currentDate: Date = new Date()
): boolean {
  const today = currentDate.getDate();
  // Criar fatura se passamos do dia de fechamento
  return today > creditCard.closingDay;
}

/**
 * Calcula como distribuir um estorno em faturas futuras
 */
export function calculateRefundDistribution(
  creditCard: CreditCard,
  refundAmount: number,
  paidInstallments: number,
  currentDate: Date = new Date()
): { 
  installments: InstallmentInfo[]; 
  strategy: 'immediate' | 'distributed' 
} {
  const amount = Math.abs(refundAmount);
  
  // Para estorno completo, não precisamos criar itens de estorno separados
  // porque já removemos os itens originais das faturas pendentes
  // O estorno deve apenas ajustar o saldo se necessário
  
  // Aplicar estorno na próxima fatura disponível como crédito
  const installments = calculateInstallmentDates(
    creditCard,
    currentDate,
    1,
    -amount
  );

  return {
    installments,
    strategy: 'immediate'
  };
}

/**
 * Verifica se uma compra pode ser estornada completamente
 */
export function canFullRefund(billItems: Array<{
  bill?: { status: string };
}>): boolean {
  return !billItems.some(item => item.bill?.status === 'PAID');
}

/**
 * Calcula o valor máximo que pode ser estornado
 */
export function calculateMaxRefundAmount(
  totalAmount: number,
  billItems: Array<{
    amount: number;
    bill?: { status: string };
  }>
): number {
  let paidAmount = 0;
  
  for (const item of billItems) {
    if (item.bill?.status === 'PAID') {
      paidAmount += item.amount;
    }
  }
  
  // Se não há parcelas pagas, pode estornar o valor total
  // Se há parcelas pagas, pode estornar no máximo o valor pago
  return paidAmount > 0 ? paidAmount : totalAmount;
}

/**
 * Obtém todas as datas de fechamento de faturas para um período
 */
type CreditBillItem = {
  id: string;
  amount: number;
  dueDate: Date;
  creditExpense: { creditCardId: string };
};

import type { PrismaClient } from '@prisma/client';

export async function createBillsForInstallments(
  prisma: PrismaClient,
  creditCard: CreditCard,
  installmentDates: InstallmentInfo[],
  userId: string
) {
  const billsToCreate: { year: number; month: number }[] = [];
  // Determinar quais faturas precisam ser criadas usando a função correta
  for (const installment of installmentDates) {
    const billPeriod = getBillPeriodForInstallment(creditCard, installment.dueDate);
    // Verificar se já não foi adicionado
    const exists = billsToCreate.some(
      bill => bill.year === billPeriod.year && bill.month === billPeriod.month
    );
    if (!exists) {
      billsToCreate.push(billPeriod);
    }
  }
  // Criar ou atualizar as faturas
  for (const period of billsToCreate) {
    const closingDate = calculateClosingDate(creditCard, period.year, period.month);
    const dueDate = calculateDueDate(creditCard, period.year, period.month);
    
    // Buscar todos os itens que devem entrar nesta fatura
    const billItems = await prisma.creditBillItem.findMany({
      where: {
        billId: null, // Ainda não associados a uma fatura
        creditExpense: {
          creditCardId: creditCard.id,
        },
      },
    });
    
    // Filtrar items que pertencem a este período de fechamento
    const itemsForThisBill = billItems.filter((item: CreditBillItem) => {
      const itemBillPeriod = getBillPeriodForInstallment(creditCard, item.dueDate);
      return itemBillPeriod.year === period.year && itemBillPeriod.month === period.month;
    });

    if (itemsForThisBill.length > 0) {
      const totalAmount = itemsForThisBill.reduce((sum: number, item: CreditBillItem) => sum + Number(item.amount), 0);
      
      // Verificar se a fatura já existe
      const existingBill = await prisma.creditBill.findFirst({
        where: {
          creditCardId: creditCard.id,
          closingDate: closingDate,
        },
      });

      if (!existingBill) {
        // Criar nova fatura
        const bill = await prisma.creditBill.create({
          data: {
            creditCardId: creditCard.id,
            closingDate,
            dueDate,
            totalAmount,
            paidAmount: 0,
            status: 'PENDING',
            userId,
          },
        });
        
        // Associar os itens à fatura
        await prisma.creditBillItem.updateMany({
          where: {
            id: {
              in: itemsForThisBill.map((item: CreditBillItem) => item.id),
            },
          },
          data: {
            billId: bill.id,
          },
        });
      } else {
        
        // Associar os novos itens à fatura existente
        await prisma.creditBillItem.updateMany({
          where: {
            id: {
              in: itemsForThisBill.map((item: CreditBillItem) => item.id),
            },
          },
          data: {
            billId: existingBill.id,
          },
        });

        // Recalcular o total da fatura existente
        const allBillItems = await prisma.creditBillItem.findMany({
          where: {
            billId: existingBill.id,
          },
        });

        const newTotalAmount = allBillItems.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
        let adjustedAmount = newTotalAmount;
        
        // Ajustar valores muito próximos de zero
        if (Math.abs(adjustedAmount) < 0.01) adjustedAmount = 0;

        // Recalcular status baseado no novo valor
        const newStatus = calculateBillStatus(adjustedAmount, existingBill.paidAmount, existingBill.dueDate, adjustedAmount);

        // Atualizar a fatura
        await prisma.creditBill.update({
          where: { id: existingBill.id },
          data: {
            totalAmount: adjustedAmount,
            status: newStatus,
          },
        });
      }
    } else {
    }
  }
}
