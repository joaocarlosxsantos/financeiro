"use client";
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './button';

type Item = { id: string; name: string };

export default function MultiSelect({
  items,
  value,
  onChange,
  placeholder,
}: {
  items: Item[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current && ref.current.contains(target)) return;
      if (dropdownRef.current && dropdownRef.current.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  const clearAll = () => onChange([]);

  const selectedNames = items.filter((w) => value.includes(w.id)).map((w) => w.name);

  const buttonLabel =
    value.length === 0
      ? placeholder || 'Nenhum'
      : selectedNames.length <= 2
      ? selectedNames.join(', ')
      : `${selectedNames[0]}, ${selectedNames[1]} +${selectedNames.length - 2}`;

  const [search, setSearch] = useState('');
  const filteredItems = items.filter((it) => it.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
  <div ref={ref} className="relative inline-block w-full">
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((s) => {
            const next = !s;
            if (next && buttonRef.current) {
              const rect = buttonRef.current.getBoundingClientRect();
              setDropdownStyle({
                position: 'fixed',
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
              });
            }
            return next;
          });
        }}
        className="w-full text-left flex items-center justify-between"
      >
        <span className="truncate">{buttonLabel}</span>
        <span className="ml-2 text-xs">▾</span>
      </Button>

      {open && (
        (typeof document !== 'undefined' && dropdownStyle) ?
        createPortal(
          <div
            ref={dropdownRef}
            style={{ ...(dropdownStyle ?? {}), zIndex: 99999 }}
            className="mt-2 max-h-64 overflow-hidden rounded-md border bg-white p-2 shadow-lg dark:bg-slate-800 dark:border-white/10 border-gray-200"
          >
            <div className="flex items-center px-2 py-1">
              <button type="button" className="text-sm text-slate-700 dark:text-slate-200 hover:underline mr-3" onClick={clearAll}>
                Limpar
              </button>
              <input
                type="text"
                aria-label="Pesquisar"
                placeholder="Pesquisar..."
                className="flex-1 px-2 py-1 rounded border border-gray-200 bg-white text-sm focus:outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
              />
            </div>
            <div className="mt-1 overflow-auto" style={{ maxHeight: '14rem' }}>
              {filteredItems.length === 0 ? (
                <div className="px-2 py-2 text-sm text-slate-500">Nenhum resultado</div>
              ) : (
                filteredItems.map((it) => (
                  <label
                    key={it.id}
                    className={`flex items-center gap-3 px-2 py-2 rounded cursor-pointer transition-colors ${
                      value.includes(it.id)
                        ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-100'
                        : 'hover:bg-slate-50 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <input type="checkbox" checked={value.includes(it.id)} onChange={() => toggle(it.id)} className="h-5 w-5" />
                    <span className="truncate">{it.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>,
          document.body
        ) : (
          <div
            ref={dropdownRef}
            style={{ ...(dropdownStyle ?? {}), zIndex: 99999 }}
            className="absolute mt-2 left-0 right-0 sm:left-auto sm:right-auto sm:w-72 max-h-64 overflow-hidden rounded-md border bg-white p-2 shadow-lg dark:bg-slate-800 dark:border-white/10 border-gray-200"
          >
            <div className="flex items-center px-2 py-1">
              <button type="button" className="text-sm text-slate-700 dark:text-slate-200 hover:underline mr-3" onClick={clearAll}>
                Limpar
              </button>
              <input
                type="text"
                aria-label="Pesquisar"
                placeholder="Pesquisar..."
                className="flex-1 px-2 py-1 rounded border border-gray-200 bg-white text-sm focus:outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
              />
            </div>
            <div className="mt-1 overflow-auto" style={{ maxHeight: '14rem' }}>
              {filteredItems.length === 0 ? (
                <div className="px-2 py-2 text-sm text-slate-500">Nenhum resultado</div>
              ) : (
                filteredItems.map((it) => (
                  <label
                    key={it.id}
                    className={`flex items-center gap-3 px-2 py-2 rounded cursor-pointer transition-colors ${
                      value.includes(it.id)
                        ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-100'
                        : 'hover:bg-slate-50 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <input type="checkbox" checked={value.includes(it.id)} onChange={() => toggle(it.id)} className="h-5 w-5" />
                    <span className="truncate">{it.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}

// Added search state and filtered items logic
