import React, { useEffect, useRef, useState } from 'react';
import { Button } from './button';

type Wallet = { id: string; name: string };

export default function WalletMultiSelect({
  wallets,
  value,
  onChange,
}: {
  wallets: Wallet[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  const clearAll = () => onChange([]);

  const selectedNames = wallets.filter((w) => value.includes(w.id)).map((w) => w.name);

  const buttonLabel =
    value.length === 0
      ? 'Todas as carteiras'
      : selectedNames.length <= 2
      ? selectedNames.join(', ')
      : `${selectedNames[0]}, ${selectedNames[1]} +${selectedNames.length - 2}`;

  return (
    <div ref={ref} className="relative inline-block w-full sm:w-auto">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((s) => !s)}
        className="w-full sm:w-auto text-left flex items-center justify-between"
      >
        <span className="truncate">{buttonLabel}</span>
        <span className="ml-2 text-xs">▾</span>
      </Button>

      {open && (
        <div className="absolute z-50 mt-2 left-0 right-0 sm:left-auto sm:right-auto sm:w-64 max-h-64 overflow-auto rounded-md border bg-white p-2 shadow-lg dark:bg-slate-800 dark:border-white/10 border-gray-200">
          <div className="flex items-center px-2 py-1">
            <button
              className="text-sm text-slate-700 dark:text-slate-200 hover:underline"
              onClick={() => {
                // limpar a seleção para indicar 'todas' (comportamento definido originalmente)
                clearAll();
              }}
            >
              Todas
            </button>
          </div>
          <div className="mt-1">
            {wallets.map((w) => (
              <label
                key={w.id}
                className={`flex items-center gap-3 px-2 py-2 rounded cursor-pointer transition-colors ${
                  value.includes(w.id)
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-100'
                    : 'hover:bg-slate-50 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={value.includes(w.id)}
                  onChange={() => toggle(w.id)}
                  className="h-5 w-5"
                />
                <span className="truncate">{w.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
