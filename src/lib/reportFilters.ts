export type ReportRow = {
  id: string;
  date?: string;
  description?: string;
  amount: number;
  kind: 'income' | 'expense';
  categoryName?: string | null;
  categoryId?: string | null;
  walletName?: string | null;
  walletId?: string | null;
  creditCardName?: string | null;
  creditCardId?: string | null;
  tags?: string[];
  isRecurring?: boolean;
};

export function filterRows(
  rows: ReportRow[],
  selectedCategoryIds: string[],
  selectedWalletIds: string[],
  selectedTagIds: string[],
  selectedCreditCardIds: string[] = [],
) {
  return rows.filter((r) => {
    if (selectedCategoryIds.length) {
      if (!r.categoryId) return false;
      if (!selectedCategoryIds.includes(String(r.categoryId))) return false;
    }
    if (selectedWalletIds.length) {
      if (!r.walletId) return false;
      if (!selectedWalletIds.includes(String(r.walletId))) return false;
    }
    if (selectedCreditCardIds.length) {
      if (!r.creditCardId) return false;
      if (!selectedCreditCardIds.includes(String(r.creditCardId))) return false;
    }
    if (selectedTagIds.length) {
      const rowTags = Array.isArray(r.tags) ? r.tags.map((x) => String(x).toLowerCase().trim()) : [];
      const sel = selectedTagIds.map((x) => String(x).toLowerCase().trim());
      // require that at least one of the selected tags exists in the row (OR / hasSome)
      const any = sel.some((t) => rowTags.includes(t));
      if (!any) return false;
    }
    return true;
  });
}
