"use client";
import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/controle-contas/modal';
import type { Member } from '@/types/controle-contas';
import { MemberForm } from '@/components/controle-contas/member-form';

function maskPhone(phone: string) {
  const cleaned = (phone || '').toString().replace(/\D/g, '');
  if (cleaned.length >= 11) return cleaned.replace(/(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
  if (cleaned.length >= 10) return cleaned.replace(/(\d{2})(\d{4})(\d{4}).*/, '($1) $2-$3');
  return phone || '';
}

export function MembersList({ groupId, showForm = true, compact = false, onChange, refreshKey }: { groupId: number; showForm?: boolean; compact?: boolean; onChange?: () => void; refreshKey?: any }) {
  const [confirmDelete, setConfirmDelete] = useState<{ member: Member | null; hasLinks: boolean }>({ member: null, hasLinks: false });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, refreshKey]);

  async function fetchMembers() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/controle-contas/membros?groupId=${groupId}`);
  const data = await res.json();
  setMembers(data);
    } catch {
      setError('Erro ao buscar membros');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/controle-contas/membros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, name, phone }),
      });
      if (!res.ok) throw new Error('Erro ao cadastrar membro');
      setName('');
      setPhone('');
  await fetchMembers();
  onChange?.();
    } catch {
      setError('Erro ao cadastrar membro');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/controle-contas/membros/has-links?memberId=${id}`);
      const data = await res.json();
      const member = members.find((m) => m.id === id) || null;
      setConfirmDelete({ member, hasLinks: !!data.hasLinks });
    } catch {
      setError('Erro ao verificar vínculos do membro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      <Modal open={!!confirmDelete.member} onClose={() => setConfirmDelete({ member: null, hasLinks: false })} title="Remover membro">
        {confirmDelete.member && confirmDelete.hasLinks ? (
          <>
            <div className="mb-4 text-destructive font-semibold">
              O membro <b>{confirmDelete.member.name}</b> possui contas vinculadas.
              <br />
              O que deseja fazer?
            </div>
            <div className="flex flex-col gap-2">
              <button
                className="rounded bg-destructive px-4 py-2 text-destructive-foreground font-semibold hover:bg-destructive/90 disabled:opacity-60"
                disabled={deleteLoading}
                onClick={async () => {
                  setDeleteLoading(true);
                  setError('');
                  try {
                    await fetch(`/api/controle-contas/membros?id=${confirmDelete.member?.id}&force=1`, { method: 'DELETE' });
                    setConfirmDelete({ member: null, hasLinks: false });
                      await fetchMembers();
                      onChange?.();
                  } catch {
                    setError('Erro ao remover membro e vínculos');
                  } finally {
                    setDeleteLoading(false);
                  }
                }}
              >Excluir membro e todos os vínculos</button>
              <button className="rounded bg-accent px-4 py-2 text-accent-foreground font-semibold" onClick={() => setConfirmDelete({ member: null, hasLinks: false })}>
                Cancelar
              </button>
            </div>
          </>
        ) : confirmDelete.member ? (
          <>
            <div className="mb-4">Deseja realmente remover <b>{confirmDelete.member.name}</b>?</div>
            <div className="flex gap-2 justify-end">
              <button
                className="rounded bg-destructive px-4 py-2 text-destructive-foreground font-semibold hover:bg-destructive/90 disabled:opacity-60"
                disabled={deleteLoading}
                onClick={async () => {
                  setDeleteLoading(true);
                  setError('');
                  try {
                    await fetch(`/api/controle-contas/membros?id=${confirmDelete.member?.id}`, { method: 'DELETE' });
                    setConfirmDelete({ member: null, hasLinks: false });
                      await fetchMembers();
                      onChange?.();
                  } catch {
                    setError('Erro ao remover membro');
                  } finally {
                    setDeleteLoading(false);
                  }
                }}
              >Remover</button>
              <button className="rounded bg-accent px-4 py-2 text-accent-foreground font-semibold" onClick={() => setConfirmDelete({ member: null, hasLinks: false })}>
                Cancelar
              </button>
            </div>
          </>
        ) : null}
      </Modal>
      {!compact && <h4 className="font-semibold mb-2 text-foreground">Membros do grupo</h4>}
      {loading && <p className="text-primary">Carregando...</p>}
      {error && <p className="text-destructive">{error}</p>}
      {compact ? (
        <div className="flex flex-col gap-2">
          {members.length === 0 && <span className="text-sm text-muted-foreground">Nenhum membro cadastrado.</span>}
          {members.map((m) => (
            <div key={m.id} className="w-full flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-base md:text-lg text-foreground truncate">{m.name}</div>
                <div className="text-sm md:text-base text-muted-foreground mt-0.5">{maskPhone(m.phone || '')}</div>
              </div>
              {showForm && (
                <button onClick={() => handleDelete(m.id)} className="ml-3 rounded px-3 py-1 text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-destructive/40">
                  Remover
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <ul className="mb-2 space-y-2">
          {members.length === 0 && <li className="text-sm text-muted-foreground">Nenhum membro cadastrado.</li>}
          {members.map((m) => (
            <li key={m.id} className="flex flex-col rounded bg-muted px-4 py-3">
              <span className="font-semibold text-lg md:text-xl text-foreground">{m.name}</span>
              <span className="text-base md:text-lg text-muted-foreground mt-1">{maskPhone(m.phone || '')}</span>
              {showForm && (
                <button onClick={() => handleDelete(m.id)} className="mt-2 self-end rounded bg-destructive px-2 py-1 text-sm text-destructive-foreground hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-destructive/40">
                  Remover
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {showForm && !compact && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <input type="text" placeholder="Nome do membro" value={name} onChange={(e) => setName(e.target.value)} required className="rounded border border-input bg-background px-3 py-2 text-lg md:text-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          <input
            type="tel"
            placeholder="Telefone do membro"
            value={phone}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/\D/g, '');
              let masked = cleaned;
              if (cleaned.length > 11) masked = cleaned.slice(0, 11);
              if (masked.length >= 11) masked = masked.replace(/(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
              else if (masked.length >= 10) masked = masked.replace(/(\d{2})(\d{4})(\d{4}).*/, '($1) $2-$3');
              e.currentTarget.value = masked;
              setPhone(masked);
            }}
            required
            maxLength={15}
            className="rounded border border-input bg-background px-3 py-2 text-lg md:text-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button type="submit" disabled={loading} className="mt-2 rounded bg-primary px-4 py-2 text-lg md:text-xl font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60">Adicionar membro</button>
        </form>
      )}
    </div>
  );
}
export default MembersList;
