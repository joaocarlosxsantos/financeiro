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

export function MembersList({ groupId, showForm = true, compact = false }: { groupId: number; showForm?: boolean; compact?: boolean }) {
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
  }, [groupId]);

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
      fetchMembers();
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
            <div className="mb-4 text-red-700 dark:text-red-300 font-semibold">
              O membro <b>{confirmDelete.member.name}</b> possui contas vinculadas.
              <br />
              O que deseja fazer?
            </div>
            <div className="flex flex-col gap-2">
              <button
                className="rounded bg-red-600 px-4 py-2 text-white font-semibold hover:bg-red-700 disabled:opacity-60"
                disabled={deleteLoading}
                onClick={async () => {
                  setDeleteLoading(true);
                  setError('');
                  try {
                    await fetch(`/api/controle-contas/membros?id=${confirmDelete.member?.id}&force=1`, { method: 'DELETE' });
                    setConfirmDelete({ member: null, hasLinks: false });
                    fetchMembers();
                  } catch {
                    setError('Erro ao remover membro e vínculos');
                  } finally {
                    setDeleteLoading(false);
                  }
                }}
              >Excluir membro e todos os vínculos</button>
              <button className="rounded bg-neutral-200 dark:bg-neutral-800 px-4 py-2 text-neutral-800 dark:text-neutral-200 font-semibold" onClick={() => setConfirmDelete({ member: null, hasLinks: false })}>
                Cancelar
              </button>
            </div>
          </>
        ) : confirmDelete.member ? (
          <>
            <div className="mb-4">Deseja realmente remover <b>{confirmDelete.member.name}</b>?</div>
            <div className="flex gap-2 justify-end">
              <button
                className="rounded bg-red-600 px-4 py-2 text-white font-semibold hover:bg-red-700 disabled:opacity-60"
                disabled={deleteLoading}
                onClick={async () => {
                  setDeleteLoading(true);
                  setError('');
                  try {
                    await fetch(`/api/controle-contas/membros?id=${confirmDelete.member?.id}`, { method: 'DELETE' });
                    setConfirmDelete({ member: null, hasLinks: false });
                    fetchMembers();
                  } catch {
                    setError('Erro ao remover membro');
                  } finally {
                    setDeleteLoading(false);
                  }
                }}
              >Remover</button>
              <button className="rounded bg-neutral-200 dark:bg-neutral-800 px-4 py-2 text-neutral-800 dark:text-neutral-200 font-semibold" onClick={() => setConfirmDelete({ member: null, hasLinks: false })}>
                Cancelar
              </button>
            </div>
          </>
        ) : null}
      </Modal>
      {!compact && <h4 className="font-semibold mb-2 text-neutral-900 dark:text-neutral-100">Membros do grupo</h4>}
      {loading && <p className="text-blue-600 dark:text-blue-400">Carregando...</p>}
      {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
      {compact ? (
        <div className="flex flex-col gap-2">
          {members.length === 0 && <span className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum membro cadastrado.</span>}
          {members.map((m) => (
            <div key={m.id} className="w-full flex items-center gap-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-base md:text-lg text-neutral-900 dark:text-neutral-100 truncate">{m.name}</div>
                <div className="text-sm md:text-base text-neutral-500 dark:text-neutral-300 mt-0.5">{maskPhone(m.phone || '')}</div>
              </div>
              {showForm && (
                <button onClick={() => handleDelete(m.id)} className="ml-3 rounded px-3 py-1 text-sm bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 dark:bg-red-500 dark:hover:bg-red-400">
                  Remover
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <ul className="mb-2 space-y-2">
          {members.length === 0 && <li className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum membro cadastrado.</li>}
          {members.map((m) => (
            <li key={m.id} className="flex flex-col rounded bg-neutral-100 dark:bg-neutral-800 px-4 py-3">
              <span className="font-semibold text-lg md:text-xl text-neutral-900 dark:text-neutral-100">{m.name}</span>
              <span className="text-base md:text-lg text-neutral-600 dark:text-neutral-300 mt-1">{maskPhone(m.phone || '')}</span>
              {showForm && (
                <button onClick={() => handleDelete(m.id)} className="mt-2 self-end rounded bg-red-600 px-2 py-1 text-sm text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 dark:bg-red-500 dark:hover:bg-red-400 dark:focus:ring-red-300">
                  Remover
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {showForm && !compact && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <input type="text" placeholder="Nome do membro" value={name} onChange={(e) => setName(e.target.value)} required className="rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-lg md:text-xl text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600" />
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
            className="rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-lg md:text-xl text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600"
          />
          <button type="submit" disabled={loading} className="mt-2 rounded bg-blue-600 px-4 py-2 text-lg md:text-xl font-semibold text-white shadow transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus:ring-blue-300 disabled:opacity-60">Adicionar membro</button>
        </form>
      )}
    </div>
  );
}
export default MembersList;
