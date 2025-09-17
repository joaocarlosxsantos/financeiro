"use client";
import { useEffect } from 'react';
import formatTitle, { TitleParts } from '@/lib/pageTitle';

type Props = TitleParts & {
  // opcional: título alternativo completo
  title?: string;
};

export default function PageTitle({ module, page, title }: Props) {
  useEffect(() => {
    const t = title ?? formatTitle({ module, page });
    if (t) document.title = t;
  }, [module, page, title]);

  return null;
}

// Helper para usar em metadata server-side: export const metadata = getMetadata({ module, page })
  // Componente cliente apenas: manipula document.title no cliente
