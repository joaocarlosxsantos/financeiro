import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMonthRange(year: number, month: number): { start: Date; end: Date } {
  // month é 1-indexed (1 = Janeiro, 12 = Dezembro)
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // Último dia do mês
  return { start, end };
}

export function getMonthYear(date: Date): string {
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${month} ${year}`;
}

export function parseApiDate(dateStr: string): Date {
  // Parse date string from API (ISO format or similar)
  return new Date(dateStr);
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}
