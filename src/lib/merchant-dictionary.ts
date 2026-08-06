/**
 * Dicionário unificado de estabelecimentos e categorias do dia a dia (Brasil).
 *
 * Antes desta consolidação, existiam pelo menos 4 dicionários diferentes e
 * divergentes espalhados pelo código (ai-categorization.ts, o parser de
 * extrato e o parser de fatura tinham cada um a sua própria lista, com
 * cobertura e nomes de categoria diferentes entre si). Este módulo é a
 * fonte única de verdade: extrato e fatura passam a usar exatamente o
 * mesmo reconhecimento de estabelecimento/categoria.
 *
 * É 100% baseado em regras/dicionário (sem chamada a IA externa) — decisão
 * tomada para não depender de OPENAI_API_KEY (hoje não configurada) e
 * manter o reconhecimento rápido, gratuito e funcionando offline.
 *
 * @module lib/merchant-dictionary
 */

export type CategoryType = 'EXPENSE' | 'INCOME' | 'BOTH';

export interface MerchantEntry {
  /** Nome canônico e limpo para exibir como descrição (ex: "Uber", "iFood"). */
  canonicalName: string;
  /** Nome da categoria sugerida (deve casar com os nomes já usados no app quando possível). */
  category: string;
  categoryType: CategoryType;
  /**
   * Palavras/trechos (minúsculos, sem acento) que identificam este
   * estabelecimento dentro da descrição normalizada.
   */
  keywords: string[];
}

export interface MerchantMatch {
  canonicalName: string;
  category: string;
  categoryType: CategoryType;
  /** 0-1 */
  confidence: number;
  matchedKeyword: string;
}

export interface CategoryBucket {
  category: string;
  categoryType: CategoryType;
  keywords: string[];
}

/**
 * Remove acentos, asteriscos e normaliza espaços/caixa para comparação.
 * Mantida exportada porque as rotas de import também precisam normalizar
 * a descrição crua antes de outras etapas (ex: extração de nome em PIX).
 */
export function normalizeForDictionary(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/\*/g, ' ')
    .replace(/[^\w\s&+-]/g, ' ') // mantém letras/números/espaço e alguns símbolos comuns (&, +, -)
    .replace(/\s+/g, ' ')
    .trim();
}

// =====================================================================
// Dicionário de estabelecimentos (marca -> nome canônico + categoria)
// Organizado por categoria só para facilitar manutenção; a ordem importa
// pouco porque identifyMerchant() escolhe o keyword mais específico
// (mais longo) entre todos os matches.
// =====================================================================

export const MERCHANT_DICTIONARY: MerchantEntry[] = [
  // ---------- Transporte por app / táxi ----------
  { canonicalName: 'Uber', category: 'Transporte', categoryType: 'EXPENSE', keywords: ['uber trip', 'uber* trip', 'uber ', 'uber'] },
  { canonicalName: '99', category: 'Transporte', categoryType: 'EXPENSE', keywords: ['99pop', '99 pop', '99app', '99 app', '99*'] },
  { canonicalName: 'Cabify', category: 'Transporte', categoryType: 'EXPENSE', keywords: ['cabify'] },
  { canonicalName: 'InDriver', category: 'Transporte', categoryType: 'EXPENSE', keywords: ['indriver', 'in driver'] },
  { canonicalName: 'Táxi', category: 'Transporte', categoryType: 'EXPENSE', keywords: ['taxi'] },
  { canonicalName: 'Estacionamento', category: 'Transporte', categoryType: 'EXPENSE', keywords: ['estacionamento', 'estapar', 'zona azul', 'parkee'] },
  { canonicalName: 'Pedágio', category: 'Transporte', categoryType: 'EXPENSE', keywords: ['pedagio', 'sem parar', 'conectcar', 'veloe'] },
  { canonicalName: 'Metrô/CPTM', category: 'Transporte', categoryType: 'EXPENSE', keywords: ['metro', 'cptm', 'bilhete unico'] },
  { canonicalName: 'Ônibus', category: 'Transporte', categoryType: 'EXPENSE', keywords: ['bilhete unico', 'onibus'] },

  // ---------- Combustível ----------
  { canonicalName: 'Shell', category: 'Transporte', categoryType: 'EXPENSE', keywords: ['shell'] },
  { canonicalName: 'Ipiranga', category: 'Transporte', categoryType: 'EXPENSE', keywords: ['ipiranga'] },
  { canonicalName: 'Petrobras/BR', category: 'Transporte', categoryType: 'EXPENSE', keywords: ['petrobras', 'br distribuidora', 'posto br'] },
  { canonicalName: 'Ale Combustíveis', category: 'Transporte', categoryType: 'EXPENSE', keywords: ['ale combustiveis', 'posto ale'] },
  { canonicalName: 'Posto de Combustível', category: 'Transporte', categoryType: 'EXPENSE', keywords: ['posto de combustivel', 'auto posto', 'posto '] },

  // ---------- Delivery de comida ----------
  { canonicalName: 'iFood', category: 'Alimentação', categoryType: 'EXPENSE', keywords: ['ifood', 'ifd*', 'ifd '] },
  { canonicalName: 'Rappi', category: 'Alimentação', categoryType: 'EXPENSE', keywords: ['rappi'] },
  { canonicalName: 'Uber Eats', category: 'Alimentação', categoryType: 'EXPENSE', keywords: ['uber eats', 'ubereats'] },
  { canonicalName: '99 Food', category: 'Alimentação', categoryType: 'EXPENSE', keywords: ['99 food', '99food'] },
  { canonicalName: 'Aiqfome', category: 'Alimentação', categoryType: 'EXPENSE', keywords: ['aiqfome'] },

  // ---------- Fast food / restaurantes conhecidos ----------
  { canonicalName: "McDonald's", category: 'Alimentação', categoryType: 'EXPENSE', keywords: ['mcdonald', 'mc donald', 'mcdonalds'] },
  { canonicalName: 'Burger King', category: 'Alimentação', categoryType: 'EXPENSE', keywords: ['burger king', 'bk '] },
  { canonicalName: 'Subway', category: 'Alimentação', categoryType: 'EXPENSE', keywords: ['subway'] },
  { canonicalName: 'KFC', category: 'Alimentação', categoryType: 'EXPENSE', keywords: ['kfc'] },
  { canonicalName: "Bob's", category: 'Alimentação', categoryType: 'EXPENSE', keywords: ["bob s", 'bobs'] },
  { canonicalName: "Habib's", category: 'Alimentação', categoryType: 'EXPENSE', keywords: ["habib s", 'habibs'] },
  { canonicalName: 'Giraffas', category: 'Alimentação', categoryType: 'EXPENSE', keywords: ['giraffas'] },
  { canonicalName: 'Outback', category: 'Alimentação', categoryType: 'EXPENSE', keywords: ['outback'] },
  { canonicalName: 'Starbucks', category: 'Alimentação', categoryType: 'EXPENSE', keywords: ['starbucks'] },
  { canonicalName: 'Domino\'s Pizza', category: 'Alimentação', categoryType: 'EXPENSE', keywords: ['dominos', "domino s"] },
  { canonicalName: 'Pizza Hut', category: 'Alimentação', categoryType: 'EXPENSE', keywords: ['pizza hut'] },
  { canonicalName: 'China in Box', category: 'Alimentação', categoryType: 'EXPENSE', keywords: ['china in box'] },

  // ---------- Supermercado / atacado ----------
  { canonicalName: 'Carrefour', category: 'Supermercado', categoryType: 'EXPENSE', keywords: ['carrefour'] },
  { canonicalName: 'Pão de Açúcar', category: 'Supermercado', categoryType: 'EXPENSE', keywords: ['pao de acucar', 'pao acucar'] },
  { canonicalName: 'Extra', category: 'Supermercado', categoryType: 'EXPENSE', keywords: ['extra hiper', 'extra super', 'super extra'] },
  { canonicalName: 'Walmart', category: 'Supermercado', categoryType: 'EXPENSE', keywords: ['walmart'] },
  { canonicalName: 'Atacadão', category: 'Supermercado', categoryType: 'EXPENSE', keywords: ['atacadao'] },
  { canonicalName: 'Assaí', category: 'Supermercado', categoryType: 'EXPENSE', keywords: ['assai'] },
  { canonicalName: 'Makro', category: 'Supermercado', categoryType: 'EXPENSE', keywords: ['makro'] },
  { canonicalName: 'Dia Supermercado', category: 'Supermercado', categoryType: 'EXPENSE', keywords: ['supermercado dia', 'dia %'] },
  { canonicalName: 'GBarbosa', category: 'Supermercado', categoryType: 'EXPENSE', keywords: ['gbarbosa'] },
  { canonicalName: 'Mundial', category: 'Supermercado', categoryType: 'EXPENSE', keywords: ['supermercado mundial'] },
  { canonicalName: 'Zaffari', category: 'Supermercado', categoryType: 'EXPENSE', keywords: ['zaffari'] },
  { canonicalName: 'Angeloni', category: 'Supermercado', categoryType: 'EXPENSE', keywords: ['angeloni'] },
  { canonicalName: 'Hortifruti/Sacolão', category: 'Supermercado', categoryType: 'EXPENSE', keywords: ['hortifruti', 'sacolao', 'quitanda'] },
  { canonicalName: 'Açougue', category: 'Supermercado', categoryType: 'EXPENSE', keywords: ['acougue'] },
  { canonicalName: 'Padaria', category: 'Alimentação', categoryType: 'EXPENSE', keywords: ['padaria', 'panificadora'] },

  // ---------- Farmácia / saúde ----------
  { canonicalName: 'Drogasil', category: 'Farmácia', categoryType: 'EXPENSE', keywords: ['drogasil'] },
  { canonicalName: 'Droga Raia', category: 'Farmácia', categoryType: 'EXPENSE', keywords: ['droga raia', 'raia '] },
  { canonicalName: 'Farmácias Pacheco', category: 'Farmácia', categoryType: 'EXPENSE', keywords: ['pacheco'] },
  { canonicalName: 'Ultrafarma', category: 'Farmácia', categoryType: 'EXPENSE', keywords: ['ultrafarma'] },
  { canonicalName: 'Pague Menos', category: 'Farmácia', categoryType: 'EXPENSE', keywords: ['pague menos'] },
  { canonicalName: 'Drogaria São Paulo', category: 'Farmácia', categoryType: 'EXPENSE', keywords: ['drogaria sao paulo', 'drogaria sp'] },
  { canonicalName: 'Panvel', category: 'Farmácia', categoryType: 'EXPENSE', keywords: ['panvel'] },
  { canonicalName: 'Hospital/Clínica', category: 'Saúde', categoryType: 'EXPENSE', keywords: ['hospital', 'clinica', 'pronto socorro'] },
  { canonicalName: 'Consulta Médica', category: 'Saúde', categoryType: 'EXPENSE', keywords: ['consulta medica', 'medico ', 'consultorio'] },
  { canonicalName: 'Dentista', category: 'Saúde', categoryType: 'EXPENSE', keywords: ['dentista', 'odontologia', 'odonto'] },
  { canonicalName: 'Laboratório/Exames', category: 'Saúde', categoryType: 'EXPENSE', keywords: ['laboratorio', 'exame', 'diagnostico'] },
  { canonicalName: 'Plano de Saúde', category: 'Saúde', categoryType: 'EXPENSE', keywords: ['unimed', 'amil', 'sulamerica saude', 'hapvida', 'notredame', 'bradesco saude', 'plano de saude'] },

  // ---------- Streaming / assinaturas ----------
  { canonicalName: 'Netflix', category: 'Assinaturas', categoryType: 'EXPENSE', keywords: ['netflix'] },
  { canonicalName: 'Spotify', category: 'Assinaturas', categoryType: 'EXPENSE', keywords: ['spotify'] },
  { canonicalName: 'Amazon Prime', category: 'Assinaturas', categoryType: 'EXPENSE', keywords: ['amazon prime', 'prime video'] },
  { canonicalName: 'Disney+', category: 'Assinaturas', categoryType: 'EXPENSE', keywords: ['disney plus', 'disney+', 'disney '] },
  { canonicalName: 'HBO Max/Max', category: 'Assinaturas', categoryType: 'EXPENSE', keywords: ['hbo max', 'hbo ', 'max app'] },
  { canonicalName: 'YouTube Premium', category: 'Assinaturas', categoryType: 'EXPENSE', keywords: ['youtube premium', 'youtube music'] },
  { canonicalName: 'Deezer', category: 'Assinaturas', categoryType: 'EXPENSE', keywords: ['deezer'] },
  { canonicalName: 'Apple Music/iCloud', category: 'Assinaturas', categoryType: 'EXPENSE', keywords: ['apple music', 'icloud', 'apple.com/bill'] },
  { canonicalName: 'Paramount+', category: 'Assinaturas', categoryType: 'EXPENSE', keywords: ['paramount plus', 'paramount+'] },
  { canonicalName: 'Globoplay', category: 'Assinaturas', categoryType: 'EXPENSE', keywords: ['globoplay'] },
  { canonicalName: 'Crunchyroll', category: 'Assinaturas', categoryType: 'EXPENSE', keywords: ['crunchyroll'] },
  { canonicalName: 'Star+', category: 'Assinaturas', categoryType: 'EXPENSE', keywords: ['star plus', 'star+'] },

  // ---------- Academia / esportes ----------
  { canonicalName: 'Smart Fit', category: 'Academia', categoryType: 'EXPENSE', keywords: ['smart fit', 'smartfit'] },
  { canonicalName: 'Bodytech', category: 'Academia', categoryType: 'EXPENSE', keywords: ['bodytech'] },
  { canonicalName: 'Bio Ritmo', category: 'Academia', categoryType: 'EXPENSE', keywords: ['bio ritmo', 'bioritmo'] },
  { canonicalName: 'Selfit', category: 'Academia', categoryType: 'EXPENSE', keywords: ['selfit'] },

  // ---------- Vestuário / moda ----------
  { canonicalName: 'Renner', category: 'Vestuário', categoryType: 'EXPENSE', keywords: ['renner'] },
  { canonicalName: 'C&A', category: 'Vestuário', categoryType: 'EXPENSE', keywords: ['c&a', 'c e a'] },
  { canonicalName: 'Riachuelo', category: 'Vestuário', categoryType: 'EXPENSE', keywords: ['riachuelo'] },
  { canonicalName: 'Zara', category: 'Vestuário', categoryType: 'EXPENSE', keywords: ['zara'] },
  { canonicalName: 'Hering', category: 'Vestuário', categoryType: 'EXPENSE', keywords: ['hering'] },
  { canonicalName: 'Marisa', category: 'Vestuário', categoryType: 'EXPENSE', keywords: ['marisa'] },
  { canonicalName: 'Centauro', category: 'Vestuário', categoryType: 'EXPENSE', keywords: ['centauro'] },
  { canonicalName: 'Nike', category: 'Vestuário', categoryType: 'EXPENSE', keywords: ['nike'] },
  { canonicalName: 'Adidas', category: 'Vestuário', categoryType: 'EXPENSE', keywords: ['adidas'] },

  // ---------- Tecnologia / games ----------
  { canonicalName: 'Google', category: 'Tecnologia', categoryType: 'EXPENSE', keywords: ['google', 'google play', 'google *'] },
  { canonicalName: 'Apple', category: 'Tecnologia', categoryType: 'EXPENSE', keywords: ['apple.com', 'app store', 'apple store'] },
  { canonicalName: 'Microsoft', category: 'Tecnologia', categoryType: 'EXPENSE', keywords: ['microsoft', 'xbox live', 'ms bill'] },
  { canonicalName: 'Steam', category: 'Tecnologia', categoryType: 'EXPENSE', keywords: ['steam'] },
  { canonicalName: 'PlayStation Store', category: 'Tecnologia', categoryType: 'EXPENSE', keywords: ['playstation', 'psn '] },
  { canonicalName: 'Xbox', category: 'Tecnologia', categoryType: 'EXPENSE', keywords: ['xbox'] },
  { canonicalName: 'Nintendo', category: 'Tecnologia', categoryType: 'EXPENSE', keywords: ['nintendo'] },
  { canonicalName: 'Adobe', category: 'Tecnologia', categoryType: 'EXPENSE', keywords: ['adobe'] },
  { canonicalName: 'Epic Games', category: 'Tecnologia', categoryType: 'EXPENSE', keywords: ['epic games'] },
  { canonicalName: 'OpenAI/ChatGPT', category: 'Tecnologia', categoryType: 'EXPENSE', keywords: ['openai', 'chatgpt'] },

  // ---------- Educação ----------
  { canonicalName: 'Udemy', category: 'Educação', categoryType: 'EXPENSE', keywords: ['udemy'] },
  { canonicalName: 'Coursera', category: 'Educação', categoryType: 'EXPENSE', keywords: ['coursera'] },
  { canonicalName: 'Alura', category: 'Educação', categoryType: 'EXPENSE', keywords: ['alura'] },
  { canonicalName: 'Faculdade/Universidade', category: 'Educação', categoryType: 'EXPENSE', keywords: ['faculdade', 'universidade', 'unip', 'anhanguera', 'estacio', 'unopar', 'mensalidade escolar'] },
  { canonicalName: 'Livraria', category: 'Educação', categoryType: 'EXPENSE', keywords: ['livraria', 'saraiva', 'cultura livraria'] },

  // ---------- Compras online / marketplace ----------
  { canonicalName: 'Mercado Livre', category: 'Compras Online', categoryType: 'EXPENSE', keywords: ['mercado livre', 'mercadolivre', 'mercadopago', 'mercado pago'] },
  { canonicalName: 'Amazon', category: 'Compras Online', categoryType: 'EXPENSE', keywords: ['amazon.com', 'amazon br', 'amazon mktp', 'amazon '] },
  { canonicalName: 'Shopee', category: 'Compras Online', categoryType: 'EXPENSE', keywords: ['shopee'] },
  { canonicalName: 'AliExpress', category: 'Compras Online', categoryType: 'EXPENSE', keywords: ['aliexpress'] },
  { canonicalName: 'Magazine Luiza', category: 'Compras Online', categoryType: 'EXPENSE', keywords: ['magazine luiza', 'magalu'] },
  { canonicalName: 'Americanas', category: 'Compras Online', categoryType: 'EXPENSE', keywords: ['americanas', 'lojas americanas'] },
  { canonicalName: 'Casas Bahia', category: 'Compras Online', categoryType: 'EXPENSE', keywords: ['casas bahia'] },
  { canonicalName: 'Submarino', category: 'Compras Online', categoryType: 'EXPENSE', keywords: ['submarino'] },
  { canonicalName: 'Shein', category: 'Compras Online', categoryType: 'EXPENSE', keywords: ['shein'] },

  // ---------- Telefonia / internet ----------
  { canonicalName: 'Vivo', category: 'Telefonia', categoryType: 'EXPENSE', keywords: ['vivo telefonica', 'vivo fibra', 'vivo '] },
  { canonicalName: 'Tim', category: 'Telefonia', categoryType: 'EXPENSE', keywords: ['tim celular', 'tim sa', 'tim '] },
  { canonicalName: 'Claro', category: 'Telefonia', categoryType: 'EXPENSE', keywords: ['claro sa', 'claro net', 'claro '] },
  { canonicalName: 'Oi', category: 'Telefonia', categoryType: 'EXPENSE', keywords: ['oi sa', 'oi telefonia', 'oi movel'] },
  { canonicalName: 'Algar Telecom', category: 'Telefonia', categoryType: 'EXPENSE', keywords: ['algar telecom', 'algar '] },

  // ---------- Contas / utilidades / moradia ----------
  { canonicalName: 'Enel', category: 'Contas', categoryType: 'EXPENSE', keywords: ['enel'] },
  { canonicalName: 'CPFL Energia', category: 'Contas', categoryType: 'EXPENSE', keywords: ['cpfl'] },
  { canonicalName: 'Cemig', category: 'Contas', categoryType: 'EXPENSE', keywords: ['cemig'] },
  { canonicalName: 'Copel', category: 'Contas', categoryType: 'EXPENSE', keywords: ['copel'] },
  { canonicalName: 'Light', category: 'Contas', categoryType: 'EXPENSE', keywords: ['light sa', 'light servicos'] },
  { canonicalName: 'Sabesp', category: 'Contas', categoryType: 'EXPENSE', keywords: ['sabesp'] },
  { canonicalName: 'Copasa', category: 'Contas', categoryType: 'EXPENSE', keywords: ['copasa'] },
  { canonicalName: 'Comgás', category: 'Contas', categoryType: 'EXPENSE', keywords: ['comgas'] },
  { canonicalName: 'Condomínio', category: 'Moradia', categoryType: 'EXPENSE', keywords: ['condominio'] },
  { canonicalName: 'Aluguel', category: 'Moradia', categoryType: 'EXPENSE', keywords: ['aluguel', 'locacao imovel', 'imobiliaria'] },

  // ---------- Pet ----------
  { canonicalName: 'Petz', category: 'Pet', categoryType: 'EXPENSE', keywords: ['petz'] },
  { canonicalName: 'Cobasi', category: 'Pet', categoryType: 'EXPENSE', keywords: ['cobasi'] },
  { canonicalName: 'Petlove', category: 'Pet', categoryType: 'EXPENSE', keywords: ['petlove'] },
  { canonicalName: 'Veterinário', category: 'Pet', categoryType: 'EXPENSE', keywords: ['veterinari', 'clinica veterinaria'] },

  // ---------- Beleza / cuidados pessoais ----------
  { canonicalName: 'Salão de Beleza', category: 'Beleza', categoryType: 'EXPENSE', keywords: ['salao de beleza', 'salao '] },
  { canonicalName: 'Barbearia', category: 'Beleza', categoryType: 'EXPENSE', keywords: ['barbearia', 'barbeiro'] },
  { canonicalName: 'O Boticário', category: 'Beleza', categoryType: 'EXPENSE', keywords: ['o boticario', 'boticario'] },
  { canonicalName: 'Sephora', category: 'Beleza', categoryType: 'EXPENSE', keywords: ['sephora'] },
  { canonicalName: 'Natura', category: 'Beleza', categoryType: 'EXPENSE', keywords: ['natura'] },

  // ---------- Bancos / fintechs (usados em transferências/pagamentos) ----------
  { canonicalName: 'Nubank', category: 'Cartão de Crédito', categoryType: 'EXPENSE', keywords: ['nubank', 'nu pagamentos'] },
  { canonicalName: 'Banco Inter', category: 'Cartão de Crédito', categoryType: 'EXPENSE', keywords: ['banco inter'] },
  { canonicalName: 'Itaú', category: 'Cartão de Crédito', categoryType: 'EXPENSE', keywords: ['itau unibanco', 'itau '] },
  { canonicalName: 'Bradesco', category: 'Cartão de Crédito', categoryType: 'EXPENSE', keywords: ['bradesco'] },
  { canonicalName: 'Santander', category: 'Cartão de Crédito', categoryType: 'EXPENSE', keywords: ['santander'] },
  { canonicalName: 'Caixa Econômica', category: 'Cartão de Crédito', categoryType: 'EXPENSE', keywords: ['caixa economica'] },
  { canonicalName: 'Banco do Brasil', category: 'Cartão de Crédito', categoryType: 'EXPENSE', keywords: ['banco do brasil'] },
  { canonicalName: 'PicPay', category: 'Cartão de Crédito', categoryType: 'EXPENSE', keywords: ['picpay'] },
  { canonicalName: 'C6 Bank', category: 'Cartão de Crédito', categoryType: 'EXPENSE', keywords: ['c6 bank', 'c6 '] },
  { canonicalName: 'PagSeguro/PagBank', category: 'Cartão de Crédito', categoryType: 'EXPENSE', keywords: ['pagseguro', 'pagbank', 'pag*'] },

  // ---------- Vale-alimentação / refeição ----------
  { canonicalName: 'Alelo', category: 'Alimentação', categoryType: 'EXPENSE', keywords: ['alelo'] },
  { canonicalName: 'Sodexo', category: 'Alimentação', categoryType: 'EXPENSE', keywords: ['sodexo'] },
  { canonicalName: 'Ticket', category: 'Alimentação', categoryType: 'EXPENSE', keywords: ['ticket alimentacao', 'ticket refeicao'] },
  { canonicalName: 'VR Benefícios', category: 'Alimentação', categoryType: 'EXPENSE', keywords: ['vr beneficios', 'vale refeicao'] },

  // ---------- Investimentos / corretoras ----------
  { canonicalName: 'Clear Corretora', category: 'Investimentos', categoryType: 'BOTH', keywords: ['clear corretora', 'clear cc'] },
  { canonicalName: 'Rico Investimentos', category: 'Investimentos', categoryType: 'BOTH', keywords: ['rico investimentos'] },
  { canonicalName: 'XP Investimentos', category: 'Investimentos', categoryType: 'BOTH', keywords: ['xp investimentos', 'xp inv'] },
  { canonicalName: 'B3', category: 'Investimentos', categoryType: 'BOTH', keywords: ['b3 sa', 'bovespa'] },

  // ---------- Receitas / benefícios ----------
  { canonicalName: 'Salário', category: 'Salário', categoryType: 'INCOME', keywords: ['salario', 'folha de pagamento', 'holerite', 'pro labore', 'pro-labore'] },
  { canonicalName: 'FGTS', category: 'Benefícios', categoryType: 'INCOME', keywords: ['fgts'] },
  { canonicalName: 'INSS', category: 'Benefícios', categoryType: 'INCOME', keywords: ['inss', 'beneficio previdenciario'] },
  { canonicalName: 'PIS/PASEP', category: 'Benefícios', categoryType: 'INCOME', keywords: ['pis pasep', 'abono salarial'] },
  { canonicalName: 'Restituição de Imposto de Renda', category: 'Benefícios', categoryType: 'INCOME', keywords: ['restituicao ir', 'restituicao imposto de renda'] },
];

// =====================================================================
// Buckets de categoria (sem nome de marca específico) — usados quando
// nenhuma entrada de MERCHANT_DICTIONARY casa, mas ainda há palavras
// genéricas que indicam a categoria (ex: "farmacia" sem citar a marca).
// =====================================================================

export const CATEGORY_KEYWORD_BUCKETS: CategoryBucket[] = [
  { category: 'Alimentação', categoryType: 'EXPENSE', keywords: ['restaurante', 'lanchonete', 'pizzaria', 'hamburgueria', 'cafeteria', 'bar ', 'confeitaria', 'sorveteria', 'comida', 'food', 'delivery', 'lanches', 'churrascaria', 'buffet'] },
  { category: 'Supermercado', categoryType: 'EXPENSE', keywords: ['mercado', 'supermercado', 'minimercado', 'empório', 'emporio', 'mercearia', 'feira'] },
  { category: 'Transporte', categoryType: 'EXPENSE', keywords: ['combustivel', 'gasolina', 'etanol', 'diesel', 'posto ', 'moto ', 'transporte', 'viagem de carro'] },
  { category: 'Farmácia', categoryType: 'EXPENSE', keywords: ['farmacia', 'drogaria', 'remedio', 'medicamento'] },
  { category: 'Lazer', categoryType: 'EXPENSE', keywords: ['cinema', 'teatro', 'show', 'ingresso', 'parque', 'clube', 'diversao', 'entretenimento', 'boliche', 'balada', 'festa'] },
  { category: 'Educação', categoryType: 'EXPENSE', keywords: ['curso', 'escola', 'material escolar', 'apostila', 'mensalidade'] },
  { category: 'Vestuário', categoryType: 'EXPENSE', keywords: ['roupa', 'calcado', 'tenis', 'sapato', 'vestuario', 'moda'] },
  { category: 'Pet', categoryType: 'EXPENSE', keywords: ['pet ', 'racao', 'petshop', 'pet shop'] },
  { category: 'Beleza', categoryType: 'EXPENSE', keywords: ['manicure', 'cabeleireiro', 'perfume', 'cosmetico', 'maquiagem', 'estetica'] },
  { category: 'Moradia', categoryType: 'EXPENSE', keywords: ['imovel', 'reforma', 'material de construcao', 'moveis', 'decoracao'] },
  { category: 'Contas', categoryType: 'EXPENSE', keywords: ['luz', 'energia eletrica', 'agua e esgoto', 'gas encanado', 'conta de consumo'] },
  { category: 'Telefonia', categoryType: 'EXPENSE', keywords: ['telefone', 'celular', 'recarga', 'internet fibra', 'banda larga'] },
  { category: 'Compras Online', categoryType: 'EXPENSE', keywords: ['www.', '.com', 'ecommerce', 'e-commerce', 'compra online', 'compra internet'] },
  { category: 'Saúde', categoryType: 'EXPENSE', keywords: ['hospital', 'clinica', 'medico', 'dentista', 'laboratorio', 'exame', 'consulta', 'fisioterapia', 'psicologo', 'terapia'] },
  { category: 'Investimentos', categoryType: 'BOTH', keywords: ['cdb', 'tesouro direto', 'lci', 'lca', 'fundo de investimento', 'acoes', 'renda fixa', 'renda variavel', 'fii', 'fiis', 'debenture', 'corretora'] },
  { category: 'Vendas', categoryType: 'INCOME', keywords: ['venda', 'vendas'] },
  { category: 'Transferência', categoryType: 'BOTH', keywords: ['pix', 'ted', 'doc', 'transferencia'] },
];

/**
 * Regras específicas para o lado de CRÉDITO de uma fatura de cartão
 * (pagamento da fatura, estorno de compra, cashback, ajuste) — não são
 * "estabelecimentos" no sentido comum, então ficam fora do dicionário
 * de marcas.
 */
export function identifyCreditCardCredit(rawDescription: string): { category: string } | null {
  const desc = normalizeForDictionary(rawDescription);
  if (!desc) return null;

  if (desc.includes('pagamento') || desc.includes('pag ') || desc.includes('fatura') || desc.includes('quitacao')) {
    return { category: 'Pagamento Cartão' };
  }
  if (desc.includes('estorno') || desc.includes('cancelamento') || desc.includes('devolucao') || desc.includes('devol')) {
    return { category: 'Estorno' };
  }
  if (desc.includes('cashback') || desc.includes('bonus')) {
    return { category: 'Cashback' };
  }
  if (desc.includes('ajuste') || desc.includes('correcao') || desc.includes('acerto')) {
    return { category: 'Ajuste' };
  }
  if (desc.includes('credito')) {
    return { category: 'Cashback' };
  }
  return null;
}

/**
 * Procura no dicionário de estabelecimentos o melhor match para a
 * descrição informada. Entre múltiplos matches, prioriza o keyword mais
 * específico (mais longo), para "uber eats" não perder para "uber".
 */
export function identifyMerchant(rawDescription: string): MerchantMatch | null {
  const desc = normalizeForDictionary(rawDescription);
  if (!desc) return null;

  let best: MerchantMatch | null = null;

  for (const entry of MERCHANT_DICTIONARY) {
    for (const rawKeyword of entry.keywords) {
      const keyword = normalizeForDictionary(rawKeyword);
      if (!keyword) continue;
      if (desc.includes(keyword)) {
        // Confiança: mais alta quanto mais longo/específico for o keyword
        // (evita, por ex., "posto " genérico competir com "shell" com a
        // mesma confiança de uma marca exata).
        const confidence = Math.min(0.98, 0.75 + keyword.length / 40);
        if (!best || keyword.length > best.matchedKeyword.length) {
          best = {
            canonicalName: entry.canonicalName,
            category: entry.category,
            categoryType: entry.categoryType,
            confidence,
            matchedKeyword: keyword,
          };
        }
      }
    }
  }

  return best;
}

/**
 * Fallback: quando nenhum estabelecimento específico foi reconhecido,
 * tenta achar apenas a categoria por palavras-chave genéricas.
 */
export function suggestCategoryOnly(
  rawDescription: string,
  type: CategoryType
): { category: string; confidence: number } | null {
  const desc = normalizeForDictionary(rawDescription);
  if (!desc) return null;

  for (const bucket of CATEGORY_KEYWORD_BUCKETS) {
    if (bucket.categoryType !== 'BOTH' && bucket.categoryType !== type) continue;
    for (const rawKeyword of bucket.keywords) {
      const keyword = normalizeForDictionary(rawKeyword);
      if (keyword && desc.includes(keyword)) {
        return { category: bucket.category, confidence: 0.6 };
      }
    }
  }

  return null;
}
