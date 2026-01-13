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
 * 
 * Lógica:
 * - Compras feitas APÓS o fechamento (ex: dia 31 se fechamento é dia 30) 
 *   vão para a fatura do MÊS SEGUINTE ao mês seguinte (ou seja, +2 meses)
 * - Compras feitas ATÉ o fechamento (ex: até dia 30)
 *   vão para a fatura do MÊS SEGUINTE (+1 mês)
 * 
 * Exemplo: Fechamento dia 30, vencimento dia 7
 * - Compra em 05/jan → Fatura de fevereiro (vence 07/fev)
 * - Compra em 29/jan → Fatura de fevereiro (vence 07/fev)  
 * - Compra em 31/jan → Fatura de março (vence 07/mar)
 */
export function calculateInstallmentDates(
  creditCard: CreditCard,
  purchaseDate: Date,
  installmentCount: number,
  totalAmount: number
): InstallmentInfo[] {
  const installments: InstallmentInfo[] = [];
  const installmentAmount = Math.round((totalAmount / installmentCount) * 100) / 100;
  
  // Determinar a qual fatura a compra pertence
  const purchaseDay = purchaseDate.getDate();
  const purchaseMonth = purchaseDate.getMonth(); // 0-based (Jan=0, Fev=1...)
  const purchaseYear = purchaseDate.getFullYear();
  
  // Se a compra foi APÓS o fechamento do mês atual, vai para a fatura do mês seguinte ao próximo (+2)
  // Se foi ATÉ o fechamento, vai para a fatura do mês seguinte (+1)  
  const isAfterClosing = purchaseDay > creditCard.closingDay;
  
  for (let i = 0; i < installmentCount; i++) {
    // Calcular quantos meses adicionar à data da compra
    // Se foi após fechamento: primeira parcela +2 meses, depois +3, +4...
    // Se foi até fechamento: primeira parcela +1 mês, depois +2, +3...
    const monthsToAdd = isAfterClosing ? i + 2 : i + 1;
    
    // Calcular o mês de vencimento da parcela (0-based)
    const targetMonth = purchaseMonth + monthsToAdd;
    const dueYear = purchaseYear + Math.floor(targetMonth / 12);
    const dueMonth = targetMonth % 12; // Normalized month (0-based)
    
    // Definir o dia de vencimento da fatura
    const dueDate = new Date(dueYear, dueMonth, creditCard.dueDay);
    
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
 * IMPORTANTE: O mês passado como parâmetro é o mês de VENCIMENTO da fatura (0-based)
 * Se o vencimento for antes do fechamento, o fechamento é no mês anterior
 */
export function calculateClosingDate(creditCard: CreditCard, year: number, month: number): Date {
  // Se o dia de vencimento for menor que o dia de fechamento, 
  // significa que o fechamento é no mês anterior ao vencimento
  const closingMonth = creditCard.dueDay < creditCard.closingDay ? month - 1 : month;
  const closingDate = new Date(year, closingMonth, creditCard.closingDay);
  
  // Se o dia de fechamento for maior que os dias do mês, usar o último dia
  const lastDayOfMonth = new Date(year, closingMonth + 1, 0).getDate();
  if (creditCard.closingDay > lastDayOfMonth) {
    closingDate.setDate(lastDayOfMonth);
  }
  
  return closingDate;
}

/**
 * Calcula a data de vencimento de uma fatura para um mês específico
 * IMPORTANTE: O mês passado como parâmetro é o mês de VENCIMENTO da fatura (0-based)
 */
export function calculateDueDate(creditCard: CreditCard, year: number, month: number): Date {
  // O vencimento é sempre no mês especificado (que é o mês de vencimento da fatura)
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
 * IMPORTANTE: O período da fatura é identificado pelo mês de VENCIMENTO da fatura
 */
export function getBillPeriodForInstallment(
  creditCard: CreditCard,
  installmentDueDate: Date
): { year: number; month: number } {
  // A data de vencimento da parcela JÁ É a data de vencimento da fatura
  // Não precisa fazer conversões complicadas
  const year = installmentDueDate.getFullYear();
  const month = installmentDueDate.getMonth(); // 0-based para usar direto nas funções
  
  return { year, month };
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
