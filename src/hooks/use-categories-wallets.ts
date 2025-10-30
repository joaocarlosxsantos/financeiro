// Hook para buscar categorias e carteiras
import { useEffect, useState } from 'react';

export function useCategoriesAndWallets() {
  const [categories, setCategories] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [catRes, walRes] = await Promise.all([
          fetch('/api/categories?&_=' + Date.now()),
          fetch('/api/wallets?&_=' + Date.now()),
        ]);
        if (catRes.ok) setCategories(await catRes.json());
        if (walRes.ok) setWallets(await walRes.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { categories, wallets, loading };
}
