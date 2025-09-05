"use client";
import React from 'react';
import type { Member, GroupSummary } from '@/types/controle-contas';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { MemberForm } from '@/components/controle-contas/member-form';
import { useState, useEffect } from 'react';

export default function MembrosListPage() {
  const [data, setData] = React.useState<Member[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [groups, setGroups] = React.useState<GroupSummary[] | null>(null);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
  fetch('/api/controle-contas/membros')
      .then((r) => r.json())
  .then((json) => { if (mounted) setData(json as Member[]); })
      .catch(() => { if (mounted) setData([]); })
      .finally(() => { if (mounted) setLoading(false); });
  fetch('/api/controle-contas/grupos').then(r => r.json()).then(j => { if (mounted) setGroups(j as GroupSummary[]); }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const handleClose = React.useCallback(() => { setOpen(false); window.location.reload(); }, []);
  const groupsById = (groups ?? []).reduce((acc: Record<number, GroupSummary>, g) => { acc[g.id] = g; return acc; }, {} as Record<number, GroupSummary>);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Membros</h1>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Novo membro</Button>
      </div>
      <MemberForm open={open} onClose={handleClose} groups={groups ?? []} />

      <div className="mt-6">
        {loading && <p>Carregando…</p>}
        {data && data.length === 0 && <p className="text-muted-foreground">Nenhum membro.</p>}
        {data && data.length > 0 && (
          <ul className="space-y-2">
            {data.map((m) => (
              <li key={m.id} className="flex items-center justify-between rounded-lg border border-white/6 p-3">
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-sm text-muted-foreground">{m.phone ?? ''}</p>
                </div>
                <div className="text-sm text-white/60">{m.groupId ? groupsById[m.groupId]?.name ?? '' : ''}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
