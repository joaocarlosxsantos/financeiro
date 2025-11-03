"use client";

import { useContasState } from '@/hooks/use-contas-state';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DollarSign, Plus, AlertCircle } from 'lucide-react';
import Link from 'next/link';

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

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 sm:p-8">
      {/* Toast */}
      {state.toastMsg && (
        <div className="fixed top-4 right-4 w-96 z-50 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-green-700 dark:text-green-300">{state.toastMsg}</p>
            </div>
            <button
              onClick={() => state.setToastMsg(null)}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
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
              <CardTitle className="text-3xl font-bold text-primary mb-2">Contas do Grupo</CardTitle>
              <CardDescription className="text-base">
                Gerencie e visualize as contas do grupo selecionado
              </CardDescription>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
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
              <Button variant="outline" asChild>
                <Link href="/controle-contas/grupos">Gerenciar Grupos</Link>
              </Button>
            </div>
          </div>
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
      {state.selectedGroup && (
        <div>
          <Button onClick={state.handleOpenAddModal} size="lg" className="gap-2">
            <Plus className="w-5 h-5" />
            Adicionar Conta
          </Button>
        </div>
      )}

      {/* Bills Grid */}
      {state.selectedGroup && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {state.bills.map((bill) => (
            <Card
              key={bill.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => state.handleOpenEditModal(bill)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{bill.name}</CardTitle>
                <CardDescription className="text-2xl font-bold text-primary">
                  R$ {bill.value.toFixed(2)}
                </CardDescription>
              </CardHeader>
              {bill.shares && bill.shares.length > 0 && (
                <CardContent>
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
            </Card>
          ))}
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
      <Dialog open={state.addModalOpen} onOpenChange={state.setAddModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Conta</DialogTitle>
            <DialogDescription>
              Preencha os dados da nova conta e distribua entre os membros
            </DialogDescription>
          </DialogHeader>
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
            <div>
              <Label htmlFor="value">Valor Total</Label>
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
                    className="w-4 h-4"
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
                      className="w-4 h-4"
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
                        className="w-4 h-4"
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
                        className="w-4 h-4"
                      />
                      <span>Porcentagem</span>
                    </label>
                  </div>
                </div>

                {/* Shares */}
                {renderShares(state.shareType, state.shares, state.value, state.setShares, state.selectedMembers)}
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => state.setAddModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={state.loading}>
                {state.loading ? "Salvando..." : "Criar Conta"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={state.editModalOpen} onOpenChange={state.setEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Conta</DialogTitle>
            <DialogDescription>
              Atualize os dados da conta e redistribua entre os membros
            </DialogDescription>
          </DialogHeader>
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
            <div>
              <Label htmlFor="edit-value">Valor Total</Label>
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
                    className="w-4 h-4"
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
                      className="w-4 h-4"
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
                        className="w-4 h-4"
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
                        className="w-4 h-4"
                      />
                      <span>Porcentagem</span>
                    </label>
                  </div>
                </div>

                {/* Shares */}
                {renderShares(state.editShareType, state.editShares, state.editValue, state.setEditShares, state.editSelectedMembers)}
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

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={() => state.setConfirmDeleteBill(true)}
              >
                Excluir
              </Button>
              <Button type="button" variant="outline" onClick={() => state.setEditModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={state.loading}>
                {state.loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={state.confirmDeleteBill} onOpenChange={state.setConfirmDeleteBill}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a conta <strong>{state.selectedBill?.name}</strong>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => state.setConfirmDeleteBill(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={state.handleDelete} disabled={state.loading}>
              {state.loading ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
