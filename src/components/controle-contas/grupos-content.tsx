'use client';

/**
 * Grupos Content Component
 */

import { useGruposState } from '@/hooks/use-grupos-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Label } from '@/components/ui/label';
import { Plus, Search, Users, Edit, Trash2 } from 'lucide-react';
import { MembersList } from '@/components/MembersList';
import { parseApiDate, formatDate } from '@/lib/utils';

export function GruposContent() {
  const state = useGruposState();

  return (
    <div className="space-y-6 flex-1 min-h-screen flex flex-col px-2 sm:px-4 pb-24">
      {/* Barra de Busca e Ação */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar grupo..."
            value={state.searchQuery}
            onChange={(e) => state.setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Button onClick={() => state.setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Grupo
        </Button>
      </div>

      {/* Mensagem de Erro */}
      {state.error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">
          {state.error}
        </div>
      )}

      {/* Loading */}
      {state.loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Lista de Grupos */}
      {!state.loading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {state.filteredGroups.map((group) => {
            let createdLabel = '';
            if (group.createdAt) {
              try {
                const dt = parseApiDate(group.createdAt);
                createdLabel = formatDate(dt);
              } catch {
                createdLabel = '';
              }
            }

            return (
              <Card key={group.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {group.name}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => state.openEditModal(group)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {createdLabel && (
                    <p className="text-xs text-muted-foreground mb-3">
                      Criado em: {createdLabel}
                    </p>
                  )}
                  <div className="mt-3">
                    <MembersList
                      groupId={group.id}
                      showForm={false}
                      compact={true}
                      onChange={state.fetchGroups}
                      refreshKey={state.groupsVersion}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {state.filteredGroups.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum grupo encontrado.</p>
                  <p className="text-sm mt-2">Crie um grupo para começar.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Modal Criar Grupo */}
      <Modal
        open={state.createModalOpen}
        onClose={() => state.setCreateModalOpen(false)}
        title="Criar Grupo"
      >
        <p className="text-sm text-muted-foreground -mt-2 mb-4">
          Crie um novo grupo para organizar suas contas e membros.
        </p>
        <form onSubmit={state.handleCreate}>
          <div className="space-y-2">
            <Label htmlFor="name">Nome do grupo</Label>
            <Input
              id="name"
              placeholder="Digite o nome do grupo"
              value={state.name}
              onChange={(e) => state.setName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={() => state.setCreateModalOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" disabled={state.loading} className="w-full sm:w-auto">
              Criar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Grupo */}
      <Modal
        open={state.editModalOpen}
        onClose={() => state.setEditModalOpen(false)}
        title="Editar Grupo"
        size="lg"
      >
        <p className="text-sm text-muted-foreground -mt-2 mb-4">
          Altere as informações do grupo ou gerencie seus membros.
        </p>
        <form onSubmit={state.handleEdit}>
          <div className="space-y-2">
            <Label htmlFor="editName">Nome do grupo</Label>
            <Input
              id="editName"
              value={state.editName}
              onChange={(e) => state.setEditName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="destructive"
              onClick={() => state.setConfirmDelete(true)}
              className="w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Grupo
            </Button>
            <Button type="button" variant="outline" onClick={() => state.setEditModalOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" disabled={state.loading} className="w-full sm:w-auto">
              Salvar
            </Button>
          </div>
        </form>

        {/* Lista de Membros */}
        {state.editGroup && (
          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-sm font-semibold mb-4">Membros do Grupo</h3>
            <MembersList
              groupId={state.editGroup.id}
              onChange={state.fetchGroups}
              refreshKey={state.groupsVersion}
            />
          </div>
        )}
      </Modal>

      {/* Modal Confirmar Exclusão */}
      <Modal
        open={state.confirmDelete}
        onClose={() => state.setConfirmDelete(false)}
        title="Confirmar Exclusão"
        size="sm"
      >
        <p className="text-sm text-muted-foreground mb-4">
          Tem certeza que deseja excluir o grupo <strong className="text-foreground">{state.editGroup?.name}</strong>?
          Essa ação não pode ser desfeita.
        </p>
        <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => state.setConfirmDelete(false)} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={state.handleDelete}
            disabled={state.loading}
            className="w-full sm:w-auto"
          >
            Excluir
          </Button>
        </div>
      </Modal>
    </div>
  );
}
