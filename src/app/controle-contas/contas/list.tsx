"use client";
import React from 'react';
import type { BillWithGroup, GroupSummary } from '@/types/controle-contas';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { BillForm } from '@/components/controle-contas/bill-form';
import { useState, useEffect } from 'react';

export default function ContasListPage() {
  const [data, setData] = React.useState<BillWithGroup[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const handleClose = React.useCallback(() => { setOpen(false); window.location.reload(); }, []);
  const [groups, setGroups] = React.useState<GroupSummary[] | null>(null);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
  fetch('/api/controle-contas/contas')
      .then((r) => r.json())
  .then((json) => { if (mounted) setData(json as BillWithGroup[]); })
      .catch(() => { if (mounted) setData([]); })
      .finally(() => { if (mounted) setLoading(false); });
  fetch('/api/controle-contas/grupos').then(r => r.json()).then(j => { if (mounted) setGroups(j as GroupSummary[]); }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contas</h1>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Nova conta</Button>
      </div>
  <BillForm open={open} onClose={handleClose} groups={groups ?? []} />

      <div className="mt-6">
        {loading && <p>Carregando…</p>}
        {data && data.length === 0 && <p className="text-muted-foreground">Nenhuma conta encontrada.</p>}
        {data && data.length > 0 && (
          <ul className="space-y-2">
            {data.map((b) => (
              <li key={b.id} className="flex items-center justify-between rounded-lg border border-white/6 p-3">
                <div>
                  <p className="font-medium">{b.title ?? b.name}</p>
                  <p className="text-sm text-muted-foreground">{b.description}</p>
                </div>
                <div className="text-sm text-white/60">{Number(b.amount).toFixed(2)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
