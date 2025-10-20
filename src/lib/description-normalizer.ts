/**
 * Normaliza descrições de transações bancárias removendo informações 
 * desnecessárias e mantendo apenas os dados mais importantes
 */

// Padrões comuns para remover ou simplificar
const REMOVAL_PATTERNS = [
  // Códigos e números longos
  /\b\d{10,}\b/g,
  // Datas no formato DD/MM/YYYY ou DD-MM-YYYY
  /\b\d{2}[\/\-]\d{2}[\/\-]\d{4}\b/g,
  // Horários
  /\b\d{1,2}:\d{2}(:\d{2})?\b/g,
  // PIX e códigos relacionados
  /PIX\s*-?\s*[A-Z0-9]{8,}/gi,
  /CODIGO?\s*[A-Z0-9]{6,}/gi,
  // Números de documento/autorização
  /DOC\s*[A-Z0-9]{6,}/gi,
  /AUT\s*[A-Z0-9]{6,}/gi,
  /AUTORIZ\w*\s*[A-Z0-9]{6,}/gi,
  // NSU, ID, etc
  /NSU\s*[A-Z0-9]{6,}/gi,
  /ID\s*[A-Z0-9]{6,}/gi,
  // Padrões específicos de bancos
  /AG\s*\d+/gi,
  /CC\s*\d+[-\s]*\d*/gi,
  /CP\s*\d+[-\s]*\d*/gi,
  /BANCO\s*\d+/gi,
  /TERMINAL/gi,
  /AUTORIZADA?\s*EM/gi,
  /VENCIMENTO/gi,
  /NO\s*VALOR\s*DE\s*R\$\s*[\d,\.]+/gi,
  // Preposições desnecessárias no final
  /\s+(EM|DE|PARA|COM)$/gi,
  // Espaços múltiplos
  /\s{2,}/g,
  // Caracteres especiais desnecessários
  /[-_]{2,}/g,
  /[*]{2,}/g,
];

// Padrões para simplificar (substituir por algo mais limpo)
const SIMPLIFICATION_PATTERNS = [
  // Cartão
  { pattern: /CART[AÃ]O\s*-?\s*(CREDITO|DEBITO|DEB|CRED)/gi, replacement: 'Cartão' },
  // Saque
  { pattern: /SAQUE\s*-?\s*(ATM|ELETR[OÔ]NICO|24H)/gi, replacement: 'Saque' },
  // Depósito
  { pattern: /DEP[OÓ]SITO\s*-?\s*(ENVELOPE|ATM|ELETR[OÔ]NICO)/gi, replacement: 'Depósito' },
  // Pagamento
  { pattern: /PAG\w*\s*-?\s*(ELETR[OÔ]NICO|ONLINE|BOLETO)/gi, replacement: 'Pagamento' },
];

// Padrões para extrair informações importantes
const IMPORTANT_INFO_PATTERNS = [
  // Nomes de estabelecimentos (palavras com pelo menos 3 caracteres)
  /\b[A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ][A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ\s]{2,}/g,
  // CPF/CNPJ mascarados
  /\*{3,}\d{2,4}/g,
];

// Função específica para extrair nomes de pessoas de PIX/TED/DOC
function extractPersonNameFromTransfer(description: string): string | null {
  // Padrões para encontrar nomes de pessoas - mais abrangentes
  const personNamePatterns = [
    // PIX RECEBIDO/ENVIADO DE/PARA [NOME] (até encontrar CPF, CHAVE, etc.)
    /PIX\s+(?:RECEBIDO|ENVIADO)\s+(?:DE|PARA)\s+([A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ][A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ\s]+?)(?:\s+CPF|\s+CHAVE|\s+BANCO|\s+NO\s+VALOR|\s*$)/i,
    // TED/DOC ENVIADO/RECEBIDO PARA/DE [NOME] (até encontrar BANCO, CPF, etc.)
    /(?:TED|DOC)\s+(?:ENVIADO|RECEBIDO)\s+(?:PARA|DE)\s+([A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ][A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ\s]+?)(?:\s+BANCO|\s+CPF|\s+AG|\s+CC|\s*$)/i,
    // PIX [NOME] (sem recebido/enviado) - até encontrar CPF, CHAVE, etc.
    /PIX\s+([A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ][A-ZÁÉÍÓÚÀÈÌ�ÙÂÊÎÔÛÃÕÇ\s]+?)(?:\s+CPF|\s+CHAVE|\s+BANCO|\s+\d{8,}|\s*$)/i,
    // Padrão mais genérico: PIX/TED/DOC seguido de qualquer texto até encontrar palavras técnicas
    /(?:PIX|TED|DOC)\s+([A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ][A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ\s]+?)(?:\s+(?:CPF|CNPJ|CHAVE|BANCO|AG|CC|CONTA|NO\s+VALOR|R\$)|\s*\d{3,}|\s*$)/i,
    // Capturar nome após preposições
    /(?:PARA|PARA\s+O|DE|DO|DA)\s+([A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ][A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ\s]+?)(?:\s+(?:CPF|CNPJ|CHAVE|BANCO|AG|CC|CONTA)|\s*\d{3,}|\s*$)/i,
  ];

  for (const pattern of personNamePatterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      let nameGroup = match[1].trim();
      
      // Limpar palavras técnicas que podem ter sido capturadas
      nameGroup = nameGroup.replace(/\b(TRANSFERENCIA|TRANSFER|ENVIADO|RECEBIDO|VALOR|NO)\b/gi, '').trim();
      
      // Validar se parece com nome (pelo menos 2 caracteres)
      if (nameGroup.length >= 2) {
        // Se tem pelo menos uma palavra válida, retornar
        const words = nameGroup.split(/\s+/).filter(word => word.length >= 2);
        if (words.length > 0) {
          return words.join(' ');
        }
      }
    }
  }
  return null;
}

// Função para detectar se é estabelecimento/empresa
function isEstablishment(name: string): boolean {
  const establishmentKeywords = [
  // Sufixos jurídicos - mais específicos para evitar falsos positivos
    'LTDA', 'LTD', ' SA', 'S/A', ' ME', 'EPP', 'EIRELI',
    // Tipos de estabelecimentos
    'LOJA', 'MAGAZINE', 'SUPERMERCADO', 'FARMACIA', 'POSTO',
    'RESTAURANTE', 'BAR', 'CAFE', 'PIZZARIA', 'LANCHONETE',
    'ACADEMIA', 'CLINICA', 'HOSPITAL', 'LABORATORIO',
    'ESCOLA', 'UNIVERSIDADE', 'CURSO',
    'BANCO', 'FINANCEIRA', 'CREDITO',
    'MERCADO', 'PADARIA', 'ACOUGUE', 'SORVETERIA',
    'EMPRESA', 'CORPORACAO', 'INDUSTRIA', 'COMERCIO',
    'SERVICOS', 'CONSULTORIA', 'TECNOLOGIA',
    // Marcas conhecidas
    'EXTRA', 'CARREFOUR', 'WALMART', 'CASAS BAHIA',
    'AMERICANAS', 'SUBMARINO', 'MERCADO LIVRE',
    'IFOOD', 'UBER', '99', 'RAPPI'
  ];
  
  const upperName = name.toUpperCase();
  
  // Se contém palavra-chave de estabelecimento
  // Verificar keywords de estabelecimento de forma mais precisa
  if (establishmentKeywords.some(keyword => {
  // Para sufixos jurídicos, verificar se é palavra isolada no final
    if ([' SA', ' ME', 'LTDA', 'LTD', 'S/A', 'EPP', 'EIRELI'].includes(keyword)) {
      return upperName.endsWith(keyword) || upperName.includes(keyword + ' ');
    }
    // Para outros termos, verificar se é palavra completa
    return upperName.includes(' ' + keyword + ' ') || 
           upperName.startsWith(keyword + ' ') || 
           upperName.endsWith(' ' + keyword);
  })) {
    return true;
  }
  
  // Se tem apenas 2 nomes simples sem sobrenomes compostos, provavelmente é pessoa
  const nameParts = name.trim().split(/\s+/);
  if (nameParts.length === 2 && 
      nameParts.every(part => part.length >= 3 && part.length <= 12)) {
    return false; // Provavelmente é pessoa física (Nome + Sobrenome)
  }
  
  // Se tem 3+ palavras e nenhuma é keyword de empresa, pode ser pessoa com nome composto
  if (nameParts.length >= 3) {
    return false; // Assume pessoa com nome composto
  }
  
  // Se tem apenas 1 palavra longa, pode ser nome fantasia/empresa
  if (nameParts.length === 1 && nameParts[0].length > 8) {
    return true; // Provavelmente empresa
  }
  
  return false; // Default para pessoa física
}

export function normalizeDescription(originalDescription: string): string {
  if (!originalDescription || typeof originalDescription !== 'string') {
    return '';
  }

  let normalized = originalDescription.trim();

  // Tratamento especial para PIX, TED e DOC
  if (/PIX|TED|DOC/gi.test(normalized)) {
    const personName = extractPersonNameFromTransfer(normalized);
    const transactionType = normalized.match(/PIX|TED|DOC/gi)?.[0]?.toUpperCase() || 'PIX';
    
    if (personName) {
      const isCompany = isEstablishment(personName);
      
      if (isCompany) {
        // É empresa/estabelecimento - manter como transação normal
        return `${transactionType} - ${personName.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}`;
      } else {
        // É pessoa física - marcar para transferência entre contas
        return `${transactionType} - ${personName.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())} (Transferência)`;
      }
    }
    
    // NUNCA retornar apenas "PIX" - sempre tentar extrair algo útil
    
    // Primeiro: tentar usar descrição original se tiver mais informação
    let cleanedOriginal = originalDescription
      .replace(/\s+/g, ' ')
      .trim();
    
    // Se a descrição original é substancialmente maior que apenas o tipo, usar ela
    if (cleanedOriginal && cleanedOriginal.length > transactionType.length + 5) {
      return cleanedOriginal;
    }
    
    // Segundo: extrair qualquer texto útil restante
    let remainingText = normalized
      .replace(/PIX|TED|DOC/gi, '')
      .replace(/\b(ENVIADO|RECEBIDO|TRANSFERENCIA|TRANSFER)\b/gi, '')
      .replace(/[-\s]+/g, ' ')
      .trim();
    
    if (remainingText && remainingText.length > 1) {
      return `${transactionType} - ${remainingText.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}`;
    }
    
    // Terceiro: pelo menos indicar se é enviado ou recebido
    if (/ENVIADO|RECEBIDO/gi.test(originalDescription)) {
      const direction = originalDescription.match(/ENVIADO|RECEBIDO/gi)?.[0];
      return `${transactionType} ${direction}`;
    }
    
    // Como último recurso absoluto, retornar a descrição original completa
    return originalDescription.trim() || transactionType;
  }

  // Aplicar padrões de simplificação para outros tipos
  SIMPLIFICATION_PATTERNS.forEach(({ pattern, replacement }) => {
    normalized = normalized.replace(pattern, replacement);
  });

  // Remover padrões desnecessários
  REMOVAL_PATTERNS.forEach(pattern => {
    normalized = normalized.replace(pattern, ' ');
  });

  // Limpar espaços extras e caracteres especiais no início/fim
  normalized = normalized
    .replace(/\s+/g, ' ')
    .replace(/^[-\s*_]+|[-\s*_]+$/g, '')
    .trim();

  // Se ficou muito curto ou vazio, tentar extrair informações importantes da original
  if (normalized.length < 3) {
    let importantInfo = '';
    IMPORTANT_INFO_PATTERNS.forEach(pattern => {
      const match = originalDescription.match(pattern);
      if (match && match[0] && match[0].length > importantInfo.length) {
        importantInfo = match[0].trim();
      }
    });
    if (importantInfo) {
      normalized = importantInfo;
    }
  }

  // Capitalizar primeira letra
  if (normalized.length > 0) {
    normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
  }

  // Se ainda estiver vazio, retornar uma versão encurtada da original
  if (normalized.length === 0) {
    normalized = originalDescription.substring(0, 30).trim();
    if (originalDescription.length > 30) {
      normalized += '...';
    }
  }

  return normalized;
}

// Função para aplicar normalização em lote
export function normalizeDescriptions(transactions: Array<{ descricao: string }>): Array<{ descricao: string; descricaoNormalizada: string }> {
  return transactions.map(transaction => ({
    ...transaction,
    descricaoNormalizada: normalizeDescription(transaction.descricao)
  }));
}
