// Mapeamento dos tipos de carteira para exibição em português
export const walletTypeLabels: Record<string, string> = {
  BANK: 'Banco',
  VALE_BENEFICIOS: 'Vale Benefícios',
  CASH: 'Dinheiro',
  OTHER: 'Outros',
};

// Função para obter o rótulo do tipo de carteira
export function getWalletTypeLabel(type: string): string {
  return walletTypeLabels[type] || type;
}