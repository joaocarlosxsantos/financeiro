"use client";
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
        ref={buttonRef}
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
        className="w-full sm:w-auto text-left flex items-center justify-between"
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
            className="mt-2 max-h-64 overflow-auto rounded-md border bg-white p-2 shadow-lg dark:bg-slate-800 dark:border-white/10 border-gray-200"
          >
            <div className="flex items-center px-2 py-1">
              <button
                className="text-sm text-slate-700 dark:text-slate-200 hover:underline"
                onClick={() => {
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
          </div>,
          document.body
        ) : (
          <div
            ref={dropdownRef}
            style={{ ...(dropdownStyle ?? {}), zIndex: 99999 }}
            className="absolute mt-2 left-0 right-0 sm:left-auto sm:right-auto sm:w-64 max-h-64 overflow-auto rounded-md border bg-white p-2 shadow-lg dark:bg-slate-800 dark:border-white/10 border-gray-200"
          >
            <div className="flex items-center px-2 py-1">
              <button
                className="text-sm text-slate-700 dark:text-slate-200 hover:underline"
                onClick={() => {
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
        )
      )}
    </div>
  );
}
