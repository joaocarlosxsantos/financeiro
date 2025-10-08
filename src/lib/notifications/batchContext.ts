// Context para controlar processamento de alertas durante importações em lote
let batchImportContext: {
  isActive: boolean;
  userId?: string;
} = {
  isActive: false
};

export function startBatchImport(userId: string) {
  batchImportContext = {
    isActive: true,
    userId
  };
}

export function endBatchImport() {
  batchImportContext = {
    isActive: false,
    userId: undefined
  };
}

export function isBatchImportActive(userId?: string): boolean {
  if (!batchImportContext.isActive) return false;
  if (userId && batchImportContext.userId !== userId) return false;
  return true;
}

export function getBatchImportContext() {
  return { ...batchImportContext };
}