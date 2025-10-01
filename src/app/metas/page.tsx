"use client";
import React, { useCallback, useEffect, useState } from 'react';
import PageTitle from '@/components/PageTitle';
import GoalCard from '@/components/metas/GoalCard';
import GoalForm from '../../components/metas/GoalForm';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Calendar } from 'lucide-react';
import { useMonth } from '@/components/providers/month-provider';

export default function GoalsPage() {
  const { currentDate, setCurrentDate } = useMonth();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any | null>(null);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const monthParam = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const res = await fetch(`/api/goals?month=${monthParam}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Erro');
      const data = await res.json();
      setGoals(data);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }, [currentDate]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  return (
    <div className="flex flex-col gap-12 w-full max-w-7xl mx-auto">
      <PageTitle module="Controle Financeiro" page="Metas" />

      <Card className="rounded-3xl border p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Metas</h2>
            <p className="text-neutral-600 dark:text-neutral-400">Visualize e cadastre suas metas recorrentes ou com prazo.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                aria-label="Mês anterior"
                className="h-10 w-10 rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center space-x-2 px-3 h-10 rounded-md border bg-white/90 border-slate-300/70 text-slate-900 shadow-sm backdrop-blur-sm dark:bg-slate-800/60 dark:border-white/15 dark:text-slate-100">
                <Calendar className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                <span className="font-medium text-sm sm:text-base">{currentDate.toLocaleString('pt-BR', { month: 'long' }).replace(/^./, s => s.toUpperCase())} {currentDate.getFullYear()}</span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const now = new Date();
                  const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
                  if (nextMonth <= now) setCurrentDate(nextMonth);
                }}
                aria-label="Próximo mês"
                className="h-10 w-10 rounded-full"
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
            <Button onClick={() => { setEditingGoal(null); setOpenForm(true); }}>Nova Meta</Button>
          </div>
        </div>
      </Card>

      <section>
        {loading && <div className="text-center py-12">Carregando...</div>}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} onClick={(goal) => { setEditingGoal(goal); setOpenForm(true); }} />
          ))}
          {!loading && goals.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed p-16 text-center text-neutral-500 dark:text-neutral-400">Nenhuma meta cadastrada.</div>
          )}
        </div>
      </section>

      {openForm && (
        <GoalForm
          initial={editingGoal ?? undefined}
          onClose={() => { setOpenForm(false); setEditingGoal(null); fetchGoals(); }}
          onSaved={() => { setOpenForm(false); setEditingGoal(null); fetchGoals(); }}
        />
      )}
    </div>
  );
}
