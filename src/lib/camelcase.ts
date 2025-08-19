// Converte string para Title Case (primeira letra maiúscula de cada palavra)
export function toTitleCase(str: string) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/(?:^|\s|[-_])([a-zà-ú])/g, (match, p1) => p1.toUpperCase())
    .replace(/\b([a-zà-ú])/g, (match) => match.toUpperCase());
}
