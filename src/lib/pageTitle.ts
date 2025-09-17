export type TitleParts = {
  module?: string | null;
  page?: string | null;
};

/**
 * Formata o título no padrão "Nome do módulo | Nome da página".
 * Regras:
 * - Se ambos informados: "Módulo | Página"
 * - Se só módulo: "Módulo"
 * - Se só página: "Página"
 * - Se nenhum: retorna `undefined`
 */
export function formatTitle({ module, page }: TitleParts): string | undefined {
  const parts: string[] = [];
  if (module && module.trim().length > 0) parts.push(module.trim());
  if (page && page.trim().length > 0) parts.push(page.trim());
  if (parts.length === 0) return undefined;
  return parts.join(' | ');
}

export default formatTitle;

export function getMetadata({ module, page, title }: TitleParts & { title?: string }) {
  const formatted = title ?? formatTitle({ module, page });
  if (!formatted) return undefined;
  return { title: formatted };
}
