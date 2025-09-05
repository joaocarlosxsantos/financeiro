import React from 'react';

export function BillCard({ name, value, children, onClick }: { name: string; value: number; children?: React.ReactNode; onClick?: () => void }) {
  return (
    <div onClick={onClick} className="rounded-lg border p-4 hover:shadow cursor-pointer bg-white dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-lg">{name}</div>
        <div className="font-bold">R$ {value.toFixed(2)}</div>
      </div>
      {children}
    </div>
  );
}
