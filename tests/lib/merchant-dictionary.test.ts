import {
  identifyMerchant,
  suggestCategoryOnly,
  identifyCreditCardCredit,
  normalizeForDictionary,
  MERCHANT_DICTIONARY,
  CATEGORY_KEYWORD_BUCKETS,
} from '@/lib/merchant-dictionary';

describe('normalizeForDictionary', () => {
  test('remove acentos, asteriscos e normaliza espaços/caixa', () => {
    expect(normalizeForDictionary('  Ifood*Restaurante   ÁÇÃO ')).toBe('ifood restaurante acao');
  });

  test('lida com string vazia/undefined', () => {
    expect(normalizeForDictionary('')).toBe('');
    expect(normalizeForDictionary(undefined as unknown as string)).toBe('');
  });
});

describe('identifyMerchant', () => {
  test('reconhece estabelecimentos comuns do dia a dia', () => {
    expect(identifyMerchant('UBER *TRIP HELP.UBER.COM')?.canonicalName).toBe('Uber');
    expect(identifyMerchant('IFD*IFOOD IFOOD.COM.BR')?.canonicalName).toBe('iFood');
    expect(identifyMerchant('NETFLIX.COM')?.canonicalName).toBe('Netflix');
    expect(identifyMerchant('PAG*LOJADOZE')?.category).toBe('Cartão de Crédito');
  });

  test('prioriza o keyword mais específico entre múltiplos matches', () => {
    // "uber eats" deve vencer o match genérico de "uber"
    const match = identifyMerchant('UBER EATS SAO PAULO');
    expect(match?.canonicalName).toBe('Uber Eats');
    expect(match?.category).toBe('Alimentação');
  });

  test('retorna null quando não há nenhum estabelecimento reconhecido', () => {
    expect(identifyMerchant('XYZ123 TRANSACAO DESCONHECIDA')).toBeNull();
    expect(identifyMerchant('')).toBeNull();
  });

  test('confiança fica entre 0.75 e 0.98', () => {
    const match = identifyMerchant('SPOTIFY AB');
    expect(match).not.toBeNull();
    expect(match!.confidence).toBeGreaterThanOrEqual(0.75);
    expect(match!.confidence).toBeLessThanOrEqual(0.98);
  });

  test('toda entrada do dicionário tem categoria e ao menos um keyword', () => {
    for (const entry of MERCHANT_DICTIONARY) {
      expect(entry.canonicalName.length).toBeGreaterThan(0);
      expect(entry.category.length).toBeGreaterThan(0);
      expect(entry.keywords.length).toBeGreaterThan(0);
    }
  });
});

describe('suggestCategoryOnly', () => {
  test('reconhece categoria genérica por palavra-chave quando não há marca específica', () => {
    expect(suggestCategoryOnly('RESTAURANTE DO ZE LTDA', 'EXPENSE')?.category).toBe('Alimentação');
    expect(suggestCategoryOnly('FARMACIA POPULAR', 'EXPENSE')?.category).toBe('Farmácia');
  });

  test('respeita o tipo (EXPENSE/INCOME/BOTH) do bucket', () => {
    // 'Vendas' é INCOME-only
    expect(suggestCategoryOnly('VENDA DE PRODUTO', 'EXPENSE')).toBeNull();
    expect(suggestCategoryOnly('VENDA DE PRODUTO', 'INCOME')?.category).toBe('Vendas');
  });

  test('retorna null quando nada bate', () => {
    expect(suggestCategoryOnly('ZZZZZ999 NADA A VER', 'EXPENSE')).toBeNull();
  });

  test('todo bucket tem keywords não vazias', () => {
    for (const bucket of CATEGORY_KEYWORD_BUCKETS) {
      expect(bucket.keywords.length).toBeGreaterThan(0);
    }
  });
});

describe('identifyCreditCardCredit', () => {
  test('reconhece pagamento de fatura', () => {
    expect(identifyCreditCardCredit('PAGAMENTO RECEBIDO')?.category).toBe('Pagamento Cartão');
    expect(identifyCreditCardCredit('PAG BOLETO FATURA')?.category).toBe('Pagamento Cartão');
  });

  test('reconhece estorno', () => {
    expect(identifyCreditCardCredit('ESTORNO DE COMPRA')?.category).toBe('Estorno');
  });

  test('reconhece cashback', () => {
    expect(identifyCreditCardCredit('CASHBACK RECEBIDO')?.category).toBe('Cashback');
  });

  test('reconhece ajuste', () => {
    // Nota: "fatura" tem prioridade sobre "ajuste" (pagamento é verificado
    // primeiro), então o texto de teste evita a palavra "fatura".
    expect(identifyCreditCardCredit('AJUSTE NO VALOR DA COMPRA')?.category).toBe('Ajuste');
  });

  test('retorna null quando a descrição não indica nenhum desses casos', () => {
    expect(identifyCreditCardCredit('XPTO SEM SENTIDO')).toBeNull();
  });
});
