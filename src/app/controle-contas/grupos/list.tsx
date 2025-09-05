"use client";
import React from 'react';
import type { GroupSummary } from '@/types/controle-contas';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { GroupForm } from '@/components/controle-contas/group-form';

export default function GruposListPage() {
  const [data, setData] = React.useState<GroupSummary[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);

  const load = React.useCallback(async function loadInner() {
    setLoading(true);
    try {
      const r = await fetch('/api/controle-contas/grupos');
      const json = await r.json();
      setData(json as GroupSummary[]);
    } catch (e) {
      setError(String(e));
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const handleClose = React.useCallback(() => { setOpen(false); load(); }, [load]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Grupos</h1>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo grupo
        </Button>
      </div>

  <GroupForm open={open} onClose={handleClose} />

      <div className="mt-6">
        {!data && !error && <p>Carregando…</p>}
        {error && <p>Erro ao carregar grupos</p>}
        {data && data.length === 0 && <p className="text-muted-foreground">Nenhum grupo criado ainda.</p>}
        {data && data.length > 0 && (
          <ul className="space-y-2">
            {data.map((g) => (
              <li key={g.id} className="flex items-center justify-between rounded-lg border border-white/6 p-3">
                <div>
                  <p className="font-medium">{g.name}</p>
                  {g.description && <p className="text-sm text-muted-foreground">{g.description}</p>}
                </div>
                <div className="text-sm text-white/60">{g.membersCount ?? ''}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
