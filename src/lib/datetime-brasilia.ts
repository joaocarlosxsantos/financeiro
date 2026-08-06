/**
 * Utilitários para trabalhar com fuso horário GMT-3 (Brasil)
 * Versão simplificada para evitar problemas de build
 */

/**
 * Obtém a data/hora atual no fuso horário de Brasília (America/Sao_Paulo).
 *
 * IMPORTANTE: um objeto Date do JS guarda só um instante absoluto — getters locais
 * (getFullYear/getMonth/getDate/...) usam o fuso horário do AMBIENTE onde o código roda,
 * não um fuso "embutido" no valor. A implementação anterior subtraía manualmente 3h de
 * `new Date()`, o que já estava incorreto no caso mais comum (usuário/servidor cujo
 * relógio já está em horário de Brasília): descontava mais 3h em cima de um horário que já
 * era o correto, deslocando a data para trás (grave perto da meia-noite, trocava o dia/mês).
 *
 * Esta versão lê os componentes de data/hora em America/Sao_Paulo via Intl.DateTimeFormat
 * (a mesma abordagem já usada em formatDateBrasilia) e reconstrói um Date cujos getters
 * locais retornam exatamente esses componentes — funciona corretamente independentemente
 * do fuso horário do ambiente (browser do usuário ou servidor em UTC).
 */
export function getNowBrasilia(): Date {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const hour = get('hour') % 24; // Intl pode retornar "24" para meia-noite com hour12:false

  return new Date(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));
}

/**
 * Converte uma data para o formato brasileiro
 */
export function formatDateBrasilia(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo'
  }).format(date);
}

/**
 * Formata data e hora completa para exibição
 */
export function formatDateTimeBrasilia(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Converte string de data do input HTML para Date
 */
export function parseInputDateBrasilia(dateString: string): Date {
  if (!dateString) return new Date();
  
  // Se é apenas data (YYYY-MM-DD), usa UTC meio-dia para evitar problemas de fuso horário
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return new Date(dateString + 'T12:00:00.000Z');
  }
  
  // Senão, parse normal
  return new Date(dateString);
}

/**
 * Obtém o início do mês atual
 */
export function getCurrentMonthRangeBrasilia(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}

/**
 * Obtém intervalo de um mês específico
 */
export function getMonthRangeBrasilia(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  return { start, end };
}

/**
 * Converte Date para string de input HTML (YYYY-MM-DD)
 */
export function formatForInputBrasilia(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Cria uma data no timezone do Brasil a partir de ano, mês e dia
 * Usa UTC meio-dia para evitar problemas de conversão de fuso horário
 */
export function createBrasiliaDate(year: number, month: number, day: number): Date {
  // Usa UTC meio-dia para evitar problemas quando salvando no banco
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}