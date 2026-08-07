"use client";

import { useContasState } from '@/hooks/use-contas-state';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DollarSign, Plus, AlertCircle, Repeat, CheckCircle2, Circle, Users, User, Layers } from 'lucide-react';
import Link from 'next/link';
import { InstallmentDeleteModal } from './installment-delete-modal';

export function ContasContent() {
  const state = useContasState();

  const renderShares = (
    shareType: 'value' | 'percent',
    shares: Array<{ memberId: number; amount: string }>,
    value: string,
    setShares: (shares: Array<{ memberId: number; amount: string }>) => void,
    selectedMembers: number[]
  ) => {
    const activeMembers = selectedMembers.length === 0
      ? state.members.map((m) => m.id)
      : selectedMembers;

    return (
      <div className="space-y-3">
        {activeMembers.map((memberId) => {
          const member = state.members.find((m) => m.id === memberId);
          const share = shares.find((s) => s.memberId === memberId);

          return (
            <div key={memberId} className="flex items-center gap-3">
              <Label className="w-32 truncate">{member?.name}</Label>
              <Input
                type="number"
                step="0.01"
                min={shareType === "percent" ? "0" : undefined}
                value={share?.amount ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setShares(
                    shares.map((s) =>
                      s.memberId === memberId ? { ...s, amount: val } : s
                    )
                  );
                }}
                className="w-28"
                placeholder={shareType === "value" ? "Valor" : "%"}
              />
              {shareType === "value" && value && (
                <span className="text-sm text-muted-foreground">
                  ({((state.parseLocaleNumber(share?.amount ?? "0") / state.parseLocaleNumber(value)) * 100).toFixed(1)}%)
                </span>
              )}
              {shareType === "percent" && value && (
                <span className="text-sm text-muted-foreground">
                  (R$ {((state.parseLocaleNumber(share?.amount ?? "0") * state.parseLocaleNumber(value)) / 100).toFixed(2)})
                </span>
              )}
            </div>
          );
        })}
        <div className="text-sm font-medium border-t pt-2 mt-3">
          Soma total:{" "}
          {shareType === "value"
            ? `R$ ${shares.reduce((acc, s) => acc + (activeMembers.includes(s.memberId) ? state.parseLocaleNumber(s.amount) : 0), 0).toFixed(2)}`
            : `${shares.reduce((acc, s) => acc + (activeMembers.includes(s.memberId) ? state.parseLocaleNumber(s.amount) : 0), 0).toFixed(2)}%`}
        </div>
      </div>
    );
  };

  // Uma conta já parcelada não pode trocar de modo pela edição (a série já
  // foi materializada em N linhas) — mostra só um resumo somativo.
  const renderInstallmentReadOnlyInfo = (bill: NonNullable<ReturnType<typeof useContasState>['selectedBill']>) => (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center gap-2 text-sm">
      <Layers className="w-4 h-4 text-primary shrink-0" />
      <span>
        Parcela <strong>{bill.installmentNumber}</strong> de <strong>{bill.installmentCount}</strong> — o número de
        parcelas não pode ser alterado depois de criada a série.
      </span>
    </div>
  );

  const renderRecurrenceFields = (
    recurrence: 'PUNCTUAL' | 'RECURRING' | 'INSTALLMENT',
    setRecurrence: (r: 'PUNCTUAL' | 'RECURRING' | 'INSTALLMENT') => void,
    endDate: string,
    setEndDate: (v: string) => void,
    installmentCount: string,
    setInstallmentCount: (v: string) => void,
    paid: boolean,
    setPaid: (v: boolean) => void,
    idPrefix: string,
    allowInstallment: boolean
  ) => (
    <div className="space-y-3">
      <div>
        <Label>Recorrência</Label>
        <div className="flex flex-wrap gap-4 mt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`${idPrefix}-recurrence`}
              checked={recurrence === 'PUNCTUAL'}
              onChange={() => setRecurrence('PUNCTUAL')}
              className="w-4 h-4 accent-primary cursor-pointer"
            />
            <span>Única</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`${idPrefix}-recurrence`}
              checked={recurrence === 'RECURRING'}
              onChange={() => setRecurrence('RECURRING')}
              className="w-4 h-4 accent-primary cursor-pointer"
            />
            <span>Recorrente (todo mês)</span>
          </label>
          {allowInstallment && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`${idPrefix}-recurrence`}
                checked={recurrence === 'INSTALLMENT'}
                onChange={() => setRecurrence('INSTALLMENT')}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
              <span>Parcelada (N vezes)</span>
            </label>
          )}
        </div>
      </div>

      {recurrence === 'RECURRING' && (
        <div>
          <Label htmlFor={`${idPrefix}-endDate`}>Repetir até (opcional)</Label>
          <Input
            id={`${idPrefix}-endDate`}
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Deixe em branco para repetir indefinidamente. O status de pago é controlado por mês.
          </p>
        </div>
      )}

      {recurrence === 'INSTALLMENT' && (
        <div>
          <Label htmlFor={`${idPrefix}-installmentCount`}>Número de parcelas</Label>
          <Input
            id={`${idPrefix}-installmentCount`}
            type="number"
            min={2}
            max={120}
            value={installmentCount}
            onChange={(e) => setInstallmentCount(e.target.value)}
            required
            className="w-32"
          />
          <p className="text-xs text-muted-foreground mt-1">
            O valor informado acima é o de <strong>cada</strong> parcela. Serão criadas {installmentCount || 'N'} contas,
            uma por mês a partir do vencimento escolhido.
          </p>
        </div>
      )}

      {recurrence === 'PUNCTUAL' && (
        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={paid}
            onChange={(e) => setPaid(e.target.checked)}
            className="w-4 h-4 accent-primary cursor-pointer"
          />
          <span>Já está paga</span>
        </label>
      )}
    </div>
  );

  const renderBillStatusBadges = (bill: ReturnType<typeof useContasState>['bills'][number]) => {
    const isPaid = bill.recurrence === 'RECURRING' ? !!bill.currentCycle?.paid : !!bill.paid;
    return (
      <div className="flex items-center gap-2 flex-wrap mt-2">
        {bill.recurrence === 'RECURRING' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-medium px-2 py-0.5">
            <Repeat className="w-3 h-3" /> Recorrente
          </span>
        )}
        {bill.recurrence === 'INSTALLMENT' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-medium px-2 py-0.5">
            <Layers className="w-3 h-3" /> Parcela {bill.installmentNumber}/{bill.installmentCount}
          </span>
        )}
        <span
          className={`inline-flex items-center gap-1 rounded-full text-xs font-medium px-2 py-0.5 ${
            isPaid ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
          }`}
        >
          {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
          {isPaid ? 'Paga' : 'Pendente'}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 sm:p-8">
      {/* Toast */}
      {state.toastMsg && (
        <div className="fixed top-4 right-4 w-96 z-50 bg-success/10 border border-success/40 rounded-lg p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-success mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-success">{state.toastMsg}</p>
            </div>
            <button
              onClick={() => state.setToastMsg(null)}
              className="text-success hover:text-success/70"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-3xl font-bold text-primary mb-2">Contas</CardTitle>
              <CardDescription className="text-base">
                Gerencie suas contas individuais e as contas compartilhadas com grupos
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link href="/controle-contas/grupos">Gerenciar Grupos</Link>
            </Button>
          </div>

          {/* View mode tabs */}
          <div className="flex gap-2 mt-4">
            <Button
              type="button"
              variant={state.viewMode === 'shared' ? 'default' : 'outline'}
              onClick={() => state.setViewMode('shared')}
              className="gap-2"
            >
              <Users className="w-4 h-4" />
              Compartilhadas
            </Button>
            <Button
              type="button"
              variant={state.viewMode === 'individual' ? 'default' : 'outline'}
              onClick={() => state.setViewMode('individual')}
              className="gap-2"
            >
              <User className="w-4 h-4" />
              Individuais
            </Button>
          </div>

          {state.viewMode === 'shared' && (
            <div className="mt-4">
              <Select
                value={state.selectedGroup?.toString() ?? ""}
                onChange={(e) => state.setSelectedGroup(Number(e.target.value))}
                className="w-full sm:w-64"
              >
                <option value="" disabled hidden>
                  -- Escolha o grupo --
                </option>
                {state.groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Error */}
      {state.error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <p className="text-sm">{state.error}</p>
          </div>
        </div>
      )}

      {/* Add Button */}
      {(state.viewMode === 'individual' || state.selectedGroup) && (
        <div>
          <Button onClick={state.handleOpenAddModal} size="lg" className="gap-2">
            <Plus className="w-5 h-5" />
            Adicionar Conta
          </Button>
        </div>
      )}

      {/* Bills Grid */}
      {(state.viewMode === 'individual' || state.selectedGroup) && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {state.bills.map((bill) => {
            const isPaid = bill.recurrence === 'RECURRING' ? !!bill.currentCycle?.paid : !!bill.paid;
            return (
              <Card key={bill.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="cursor-pointer" onClick={() => state.handleOpenEditModal(bill)}>
                  <CardTitle className="text-lg">{bill.name}</CardTitle>
                  <CardDescription className="text-2xl font-bold text-primary">
                    R$ {bill.value.toFixed(2)}
                  </CardDescription>
                  {renderBillStatusBadges(bill)}
                </CardHeader>
                {bill.shares && bill.shares.length > 0 && (
                  <CardContent className="cursor-pointer" onClick={() => state.handleOpenEditModal(bill)}>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {bill.shares.map((share) => {
                        const member = state.members.find((m) => m.id === share.memberId);
                        return (
                          <div key={share.memberId} className="flex justify-between">
                            <span>{member?.name}</span>
                            <span className="font-medium">
                              {share.type === 'value'
                                ? `R$ ${share.amount.toFixed(2)}`
                                : `${share.amount.toFixed(1)}%`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
                <CardContent className="pt-0">
                  <Button
                    type="button"
                    size="sm"
                    variant={isPaid ? 'outline' : 'default'}
                    className="w-full gap-2"
                    onClick={() => state.handleTogglePaid(bill)}
                  >
                    {isPaid ? <Circle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    {isPaid ? 'Marcar como pendente' : 'Marcar como paga'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          {state.bills.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <DollarSign className="w-12 h-12 mb-4 opacity-50" />
                <p>Nenhuma conta encontrada</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Add Modal */}
      <Modal
        open={state.addModalOpen}
        onClose={() => state.setAddModalOpen(false)}
        title={`Adicionar Conta ${state.viewMode === 'individual' ? 'Individual' : 'Compartilhada'}`}
        size="lg"
      >
        <p className="text-sm text-muted-foreground -mt-2 mb-4">
          {state.viewMode === 'individual'
            ? 'Preencha os dados da nova conta'
            : 'Preencha os dados da nova conta e distribua entre os membros'}
        </p>
        <form onSubmit={state.handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome da Conta</Label>
              <Input
                id="name"
                value={state.name}
                onChange={(e) => state.setName(e.target.value)}
                required
                placeholder="Ex: Aluguel, Luz, Água..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="value">{state.recurrence === 'INSTALLMENT' ? 'Valor de cada parcela' : 'Valor Total'}</Label>
                <Input
                  id="value"
                  type="text"
                  inputMode="decimal"
                  value={state.value}
                  onChange={(e) => state.setValue(e.target.value)}
                  onBlur={() => {
                    const ids = state.selectedMembers.length === 0
                      ? state.members.map((m) => m.id)
                      : state.selectedMembers;
                    state.setShares(state.getEqualShares(state.shareType, state.value, ids));
                  }}
                  required
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="dueDate">{state.recurrence === 'INSTALLMENT' ? 'Vencimento da 1ª parcela' : 'Vencimento'}</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={state.dueDate}
                  onChange={(e) => state.setDueDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {renderRecurrenceFields(
              state.recurrence,
              state.setRecurrence,
              state.endDate,
              state.setEndDate,
              state.installmentCount,
              state.setInstallmentCount,
              state.paid,
              state.setPaid,
              'add',
              true
            )}

            {state.viewMode === 'shared' && (
              <>
                {/* Members */}
                <div className="space-y-2">
                  <Label>Participantes</Label>
                  <div className="flex flex-wrap gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.selectedMembers.length === 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            state.setSelectedMembers([]);
                          } else {
                            state.setSelectedMembers(state.members.map((m) => m.id));
                          }
                        }}
                        className="w-4 h-4 accent-primary cursor-pointer"
                      />
                      <span className="font-semibold">Todos</span>
                    </label>
                    {state.members.map((m) => (
                      <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={state.selectedMembers.length === 0 || state.selectedMembers.includes(m.id)}
                          onChange={(e) => {
                            let newSelected;
                            if (state.selectedMembers.length === 0) {
                              newSelected = state.members.filter((mem) => mem.id !== m.id).map((mem) => mem.id);
                            } else if (e.target.checked) {
                              newSelected = [...state.selectedMembers, m.id];
                            } else {
                              newSelected = state.selectedMembers.filter((id) => id !== m.id);
                            }
                            if (newSelected.length === state.members.length) {
                              state.setSelectedMembers([]);
                            } else {
                              state.setSelectedMembers(newSelected);
                            }
                          }}
                          className="w-4 h-4 accent-primary cursor-pointer"
                        />
                        <span>{m.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Share Type */}
                {(state.selectedMembers.length === 0 ? state.members.length > 0 : state.selectedMembers.length > 0) && (
                  <>
                    <div>
                      <Label>Tipo de Divisão</Label>
                      <div className="flex gap-4 mt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="shareType"
                            value="value"
                            checked={state.shareType === "value"}
                            onChange={() => state.setShareType("value")}
                            className="w-4 h-4 accent-primary cursor-pointer"
                          />
                          <span>Valor</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="shareType"
                            value="percent"
                            checked={state.shareType === "percent"}
                            onChange={() => state.setShareType("percent")}
                            className="w-4 h-4 accent-primary cursor-pointer"
                          />
                          <span>Porcentagem</span>
                        </label>
                      </div>
                    </div>

                    {/* Shares */}
                    {renderShares(state.shareType, state.shares, state.value, state.setShares, state.selectedMembers)}
                  </>
                )}
              </>
            )}

            {/* Validation Error */}
            {state.validationError && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                  <p className="text-sm">{state.validationError}</p>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => state.setAddModalOpen(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" disabled={state.loading} className="w-full sm:w-auto">
                {state.loading ? "Salvando..." : "Criar Conta"}
              </Button>
            </div>
          </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={state.editModalOpen}
        onClose={() => state.setEditModalOpen(false)}
        title="Editar Conta"
        size="lg"
      >
        <p className="text-sm text-muted-foreground -mt-2 mb-4">
          {state.selectedBill?.scope === 'SHARED'
            ? 'Atualize os dados da conta e redistribua entre os membros'
            : 'Atualize os dados da conta'}
        </p>
        <form onSubmit={state.handleEdit} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome da Conta</Label>
              <Input
                id="edit-name"
                value={state.editName}
                onChange={(e) => state.setEditName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-value">{state.selectedBill?.recurrence === 'INSTALLMENT' ? 'Valor desta parcela' : 'Valor Total'}</Label>
                <Input
                  id="edit-value"
                  type="text"
                  inputMode="decimal"
                  value={state.editValue}
                  onChange={(e) => state.setEditValue(e.target.value)}
                  onBlur={() => {
                    const ids = state.editSelectedMembers.length === 0
                      ? state.members.map((m) => m.id)
                      : state.editSelectedMembers;
                    state.setEditShares(state.getEqualShares(state.editShareType, state.editValue, ids));
                  }}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-dueDate">Vencimento</Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={state.editDueDate}
                  onChange={(e) => state.setEditDueDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {state.selectedBill?.recurrence === 'INSTALLMENT'
              ? renderInstallmentReadOnlyInfo(state.selectedBill)
              : renderRecurrenceFields(
                  state.editRecurrence,
                  state.setEditRecurrence,
                  state.editEndDate,
                  state.setEditEndDate,
                  state.installmentCount,
                  state.setInstallmentCount,
                  state.editPaid,
                  state.setEditPaid,
                  'edit',
                  false
                )}

            {state.selectedBill?.scope === 'SHARED' && (
              <>
                {/* Members */}
                <div className="space-y-2">
                  <Label>Participantes</Label>
                  <div className="flex flex-wrap gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.editSelectedMembers.length === 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            state.setEditSelectedMembers([]);
                          } else {
                            state.setEditSelectedMembers(state.members.map((m) => m.id));
                          }
                        }}
                        className="w-4 h-4 accent-primary cursor-pointer"
                      />
                      <span className="font-semibold">Todos</span>
                    </label>
                    {state.members.map((m) => (
                      <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={state.editSelectedMembers.length === 0 || state.editSelectedMembers.includes(m.id)}
                          onChange={(e) => {
                            let newSelected;
                            if (state.editSelectedMembers.length === 0) {
                              newSelected = state.members.filter((mem) => mem.id !== m.id).map((mem) => mem.id);
                            } else if (e.target.checked) {
                              newSelected = [...state.editSelectedMembers, m.id];
                            } else {
                              newSelected = state.editSelectedMembers.filter((id) => id !== m.id);
                            }
                            if (newSelected.length === state.members.length) {
                              state.setEditSelectedMembers([]);
                            } else {
                              state.setEditSelectedMembers(newSelected);
                            }
                          }}
                          className="w-4 h-4 accent-primary cursor-pointer"
                        />
                        <span>{m.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Share Type */}
                {(state.editSelectedMembers.length === 0 ? state.members.length > 0 : state.editSelectedMembers.length > 0) && (
                  <>
                    <div>
                      <Label>Tipo de Divisão</Label>
                      <div className="flex gap-4 mt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="editShareType"
                            value="value"
                            checked={state.editShareType === "value"}
                            onChange={() => state.setEditShareType("value")}
                            className="w-4 h-4 accent-primary cursor-pointer"
                          />
                          <span>Valor</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="editShareType"
                            value="percent"
                            checked={state.editShareType === "percent"}
                            onChange={() => state.setEditShareType("percent")}
                            className="w-4 h-4 accent-primary cursor-pointer"
                          />
                          <span>Porcentagem</span>
                        </label>
                      </div>
                    </div>

                    {/* Shares */}
                    {renderShares(state.editShareType, state.editShares, state.editValue, state.setEditShares, state.editSelectedMembers)}
                  </>
                )}
              </>
            )}

            {/* Validation Error */}
            {state.validationError && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                  <p className="text-sm">{state.validationError}</p>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="destructive"
                onClick={() => state.openDeleteConfirm()}
                className="w-full sm:w-auto"
              >
                Excluir
              </Button>
              <Button type="button" variant="outline" onClick={() => state.setEditModalOpen(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" disabled={state.loading} className="w-full sm:w-auto">
                {state.loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={state.confirmDeleteBill}
        onClose={() => state.setConfirmDeleteBill(false)}
        title="Confirmar Exclusão"
        size="sm"
      >
        <p className="text-sm text-muted-foreground mb-4">
          Tem certeza que deseja excluir a conta <strong className="text-foreground">{state.selectedBill?.name}</strong>?
          Esta ação não pode ser desfeita.
        </p>
        <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
          <Button variant="outline" onClick={() => state.setConfirmDeleteBill(false)} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button variant="destructive" onClick={state.handleDelete} disabled={state.loading} className="w-full sm:w-auto">
            {state.loading ? "Excluindo..." : "Excluir"}
          </Button>
        </div>
      </Modal>

      {/* Installment Delete Modal */}
      {state.selectedBill?.recurrence === 'INSTALLMENT' && (
        <InstallmentDeleteModal
          open={state.installmentDeleteOpen}
          onClose={() => state.setInstallmentDeleteOpen(false)}
          onConfirm={state.handleDeleteInstallment}
          billName={state.selectedBill.name}
          installmentNumber={state.selectedBill.installmentNumber ?? 1}
          installmentCount={state.selectedBill.installmentCount ?? 1}
          loading={state.loading}
        />
      )}
    </div>
  );
}
