import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";

interface UserProfileProps {
  className?: string;
}

export function UserProfile({ className }: UserProfileProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [user, setUser] = useState({ name: "", email: "", phone: "" });
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwords, setPasswords] = useState({ password: "", confirm: "" });
  const [passwordError, setPasswordError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/user").then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setForm(data);
      }
    });
  }, []);

  const handleEdit = () => setEdit(true);
  const handleCancel = () => {
    setEdit(false);
    setForm(user);
    setMessage("");
  };
  const handleSave = async () => {
    const newErrors: { name?: string; email?: string } = {};
    if (!form.name.trim()) newErrors.name = 'Nome é obrigatório.';
    if (!form.email.trim()) newErrors.email = 'Email é obrigatório.';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/user", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
      setEdit(false);
      setMessage("Dados atualizados!");
      setErrors({});
    } else {
      setMessage("Erro ao atualizar dados");
    }
    setLoading(false);
  };

  const handlePasswordSave = async () => {
    setPasswordError("");
    if (passwords.password.length < 6) {
      setPasswordError("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (passwords.password !== passwords.confirm) {
      setPasswordError("As senhas não coincidem");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/user/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: passwords.password }),
    });
    if (res.ok) {
      setShowPasswordModal(false);
      setPasswords({ password: "", confirm: "" });
      setMessage("Senha alterada com sucesso!");
    } else {
      const data = await res.json().catch(() => ({}));
      setPasswordError(data?.error || "Erro ao alterar senha");
    }
    setLoading(false);
  };

  return (
    <Card className={className || "w-full max-w-md mx-auto"}>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Meu Perfil</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={form.name}
              disabled={!edit}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            {errors.name && <span className="text-red-600 text-xs">{errors.name}</span>}
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={form.email}
              disabled={!edit}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
            {errors.email && <span className="text-red-600 text-xs">{errors.email}</span>}
          </div>
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={form.phone || ""}
              disabled={!edit}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="(99) 99999-9999"
            />
          </div>
          {message && <div className="text-center text-sm text-green-600">{message}</div>}
          <div className="flex gap-2 mt-4">
            {!edit && (
              <Button onClick={handleEdit} className="flex-1">Editar</Button>
            )}
            {edit && (
              <>
                <Button onClick={handleSave} className="flex-1" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
                <Button onClick={handleCancel} className="flex-1" variant="outline" disabled={loading}>Cancelar</Button>
              </>
            )}
          </div>
          <Button variant="secondary" className="w-full mt-2" onClick={() => setShowPasswordModal(true)}>
            Alterar senha
          </Button>
          <Button variant="destructive" className="w-full mt-2" onClick={() => setShowDeleteModal(true)}>
            Excluir TODOS os meus dados (atalho de limpeza)
          </Button>
        </div>
      </CardContent>
      <Modal open={showPasswordModal} onClose={() => { setShowPasswordModal(false); setPasswords({ password: "", confirm: "" }); setPasswordError(""); }} title="Alterar senha">
        <div className="space-y-4">
          <div>
            <Label htmlFor="new-password">Nova senha</Label>
            <Input id="new-password" type="password" value={passwords.password} onChange={e => setPasswords(p => ({ ...p, password: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="confirm-password">Confirme a nova senha</Label>
            <Input id="confirm-password" type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} />
          </div>
          {passwordError && <div className="text-red-600 text-sm text-center">{passwordError}</div>}
          <div className="flex gap-2 mt-4">
            <Button onClick={handlePasswordSave} className="flex-1" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
            <Button onClick={() => { setShowPasswordModal(false); setPasswords({ password: "", confirm: "" }); setPasswordError(""); }} className="flex-1" variant="outline" disabled={loading}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal de confirmação de exclusão */}
      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Excluir todos os dados?">
        <div className="space-y-4">
          <div className="text-red-600 text-center font-semibold">Tem certeza que deseja excluir TODOS os seus dados? Essa ação não pode ser desfeita!</div>
          <div className="flex gap-2 mt-4">
            <Button
              variant="destructive"
              className="flex-1"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                await fetch('/api/user/delete-data', { method: 'POST' });
                setDeleting(false);
                setShowDeleteModal(false);
                setMessage('Todos os dados foram excluídos!');
                // Opcional: recarregar a página ou buscar novamente os dados do usuário
              }}
            >
              {deleting ? 'Excluindo...' : 'Sim, excluir tudo'}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={deleting}
              onClick={() => setShowDeleteModal(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
