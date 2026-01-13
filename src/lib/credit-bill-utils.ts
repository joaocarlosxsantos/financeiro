/**
 * Utilitários para cálculo e gerenciamento de faturas de cartão de crédito
 */

/**
 * Recalcula o valor total de uma fatura
 * Total = Soma dos gastos - Soma dos créditos
 * 
 * @param tx - Transação do Prisma
 * @param billId - ID da fatura a ser recalculada
 * @returns O novo valor total da fatura
 */
export async function recalculateBillTotal(tx: any, billId: string): Promise<number> {
  // Somar todos os gastos da fatura
  const expenses = await tx.creditExpense.aggregate({
    where: { creditBillId: billId },
    _sum: { amount: true },
  });

  // Somar todos os créditos da fatura
  const incomes = await tx.creditIncome.aggregate({
    where: { creditBillId: billId },
    _sum: { amount: true },
  });

  const totalExpenses = expenses._sum.amount || 0;
  const totalIncomes = incomes._sum.amount || 0;
  const totalAmount = Number(totalExpenses) - Number(totalIncomes);

  // Atualizar a fatura com o novo total
  await tx.creditBill.update({
    where: { id: billId },
    data: { totalAmount },
  });

  return totalAmount;
}

/**
 * Recalcula múltiplas faturas de uma vez
 * Útil quando uma operação afeta mais de uma fatura (ex: mover registro entre faturas)
 * 
 * @param tx - Transação do Prisma
 * @param billIds - Array de IDs das faturas a serem recalculadas
 */
export async function recalculateMultipleBills(tx: any, billIds: string[]): Promise<void> {
  // Filtrar IDs nulos/undefined
  const validBillIds = billIds.filter(Boolean);
  
  if (validBillIds.length === 0) return;

  // Recalcular cada fatura
  await Promise.all(
    validBillIds.map(billId => recalculateBillTotal(tx, billId))
  );
}
