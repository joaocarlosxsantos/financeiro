'use client';

import { useEffect, useState, useCallback } from 'react';

interface Group {
  id: number;
  name: string;
  createdAt: string;
}

export function useGruposState() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsVersion, setGroupsVersion] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchGroups();
  }, []);

  const filteredGroups = groups.filter((g) =>
    searchQuery.trim() === '' || g.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  async function fetchGroups() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/controle-contas/grupos');
      const data = await res.json();
      setGroups(data);
      setGroupsVersion((v) => v + 1);
    } catch {
      setError('Erro ao buscar grupos');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/controle-contas/grupos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Erro ao cadastrar grupo');
      setName('');
      setCreateModalOpen(false);
      fetchGroups();
    } catch {
      setError('Erro ao cadastrar grupo');
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editGroup) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/controle-contas/grupos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editGroup.id, name: editName }),
      });
      if (!res.ok) throw new Error('Erro ao editar grupo');
      setEditModalOpen(false);
      setEditGroup(null);
      fetchGroups();
    } catch {
      setError('Erro ao editar grupo');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!editGroup) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/controle-contas/grupos?id=${editGroup.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir grupo');
      setConfirmDelete(false);
      setEditModalOpen(false);
      setEditGroup(null);
      await fetchGroups();
    } catch {
      setError('Erro ao excluir grupo. Verifique se não há membros vinculados.');
    } finally {
      setLoading(false);
    }
  }

  const openEditModal = useCallback((group: Group) => {
    setEditGroup(group);
    setEditName(group.name);
    setEditModalOpen(true);
  }, []);

  return {
    groups,
    filteredGroups,
    groupsVersion,
    searchQuery,
    setSearchQuery,
    loading,
    error,
    createModalOpen,
    setCreateModalOpen,
    editModalOpen,
    setEditModalOpen,
    confirmDelete,
    setConfirmDelete,
    editGroup,
    name,
    setName,
    editName,
    setEditName,
    handleCreate,
    handleEdit,
    handleDelete,
    openEditModal,
    fetchGroups,
  };
}
