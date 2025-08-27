import { useEffect, useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import ThemeSelector from '@/components/ui/theme-selector';
import { useTheme } from '@/components/providers/theme-provider';
import { Eye, EyeOff, Copy, Check } from 'lucide-react';

interface UserProfileProps { className?: string }

export function UserProfile({ className }: UserProfileProps) {
  const { setTheme } = useTheme();
  const [user, setUser] = useState({ name: '', email: '', phone: '' });
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [edit, setEdit] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwords, setPasswords] = useState({ password: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const liveRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/user');
        if (!cancelled && res.ok) {
          const data = await res.json();
          setUser(data);
          setForm({ name: data.name || '', email: data.email || '', phone: data.phone || '' });
          if (data.theme) setTheme(data.theme);
        }
      } finally { if (!cancelled) setInitialLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [setTheme]);

  const dirty = useMemo(() => (
    form.name !== user.name || form.email !== user.email || (form.phone || '') !== (user.phone || '')
  ), [form, user]);

  useEffect(() => {
    if (edit) {
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        setErrors(e => ({ ...e, email: 'Formato de email inválido.' }));
      } else {
        setErrors(e => ({ ...e, email: e.email && e.email.startsWith('Formato') ? undefined : e.email }));
      }
    }
  }, [form.email, edit]);

  const handleEdit = () => { setEdit(true); setMessage(''); };
  const handleCancel = () => { setEdit(false); setForm({ name: user.name, email: user.email, phone: user.phone || '' }); setMessage(''); };

  const handleSave = async () => {
    const newErrors: { name?: string; email?: string } = {};
    if (!form.name.trim()) newErrors.name = 'Nome é obrigatório.';
    if (!form.email.trim()) newErrors.email = 'Email é obrigatório.';
    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/user', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setEdit(false);
        setMessage('Dados atualizados!');
        if (liveRef.current) liveRef.current.textContent = 'Perfil salvo com sucesso';
      } else {
        setMessage('Erro ao atualizar dados');
        if (liveRef.current) liveRef.current.textContent = 'Erro ao salvar perfil';
      }
    } finally { setLoading(false); }
  };

  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    let formatted = digits;
    if (digits.length > 2) formatted = `(${digits.slice(0,2)}) ${digits.slice(2)}`;
    if (digits.length > 6) formatted = `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
    setForm(f => ({ ...f, phone: formatted }));
  };

  const passwordStrength = useMemo(() => {
    const p = passwords.password; if (!p) return 0; let score = 0;
    if (p.length >= 6) score++; if (p.length >= 10) score++; if (/[A-Z]/.test(p)) score++; if (/[0-9]/.test(p)) score++; if (/[^A-Za-z0-9]/.test(p)) score++;
    return Math.min(score, 5);
  }, [passwords.password]);
  const strengthColor = ['bg-red-500','bg-orange-500','bg-yellow-500','bg-blue-500','bg-green-500'];

  const handlePasswordSave = async () => {
    setPasswordError('');
    if (passwords.password.length < 6) { setPasswordError('A senha deve ter pelo menos 6 caracteres'); return; }
    if (passwords.password !== passwords.confirm) { setPasswordError('As senhas não coincidem'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/user/password', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: passwords.password }) });
      if (res.ok) {
        setShowPasswordModal(false); setPasswords({ password: '', confirm: '' }); setMessage('Senha alterada com sucesso!'); if (liveRef.current) liveRef.current.textContent = 'Senha alterada com sucesso';
      } else {
        const data = await res.json().catch(() => ({})); setPasswordError(data?.error || 'Erro ao alterar senha');
      }
    } finally { setLoading(false); }
  };

  return (
    <Card className={className || 'w-full max-w-2xl mx-auto'}>
      <CardHeader className="text-center"><CardTitle className="text-2xl">Meu Perfil</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-8">
          <section>
            <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase mb-3">Dados Pessoais</h3>
            {initialLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-10 bg-muted rounded" />
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-10 bg-muted rounded" />
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-10 bg-muted rounded" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" value={form.name} disabled={!edit} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
                  {errors.name && <span className="text-red-600 text-xs">{errors.name}</span>}
                </div>
                <div className="relative">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={form.email} disabled={!edit} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
                  {errors.email && <span className="text-red-600 text-xs">{errors.email}</span>}
                  <button type="button" onClick={async () => { await navigator.clipboard.writeText(form.email); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="absolute top-7 right-2 p-2 text-muted-foreground hover:text-foreground" aria-label="Copiar email">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button>
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" value={form.phone || ''} disabled={!edit} onChange={(e) => handlePhoneChange(e.target.value)} placeholder="(99) 99999-9999" />
                </div>
              </div>
            )}
          </section>
          <section>
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              {!edit && <Button onClick={handleEdit} className="flex-1" disabled={initialLoading}>Editar</Button>}
              {edit && <>
                <Button onClick={handleSave} className="flex-1" disabled={loading || !dirty}>{loading ? 'Salvando...' : 'Salvar'}</Button>
                <Button onClick={handleCancel} className="flex-1" variant="outline" disabled={loading}>Cancelar</Button>
              </>}
              <Button variant="secondary" className="flex-1" onClick={() => setShowPasswordModal(true)} disabled={initialLoading}>Alterar senha</Button>
            </div>
            {message && <div className="text-center text-sm text-green-600 mt-2" aria-live="polite">{message}</div>}
            <div ref={liveRef} className="sr-only" aria-live="polite" />
          </section>
          <section className="pt-2 border-t">
            <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase mb-3">Preferências</h3>
            <ThemeSelector />
          </section>
        </div>
      </CardContent>
      <Modal open={showPasswordModal} onClose={() => { setShowPasswordModal(false); setPasswords({ password: '', confirm: '' }); setPasswordError(''); }} title="Alterar senha">
        <div className="space-y-4">
          <div className="relative">
            <Label htmlFor="new-password">Nova senha</Label>
            <Input id="new-password" type={showPassword ? 'text' : 'password'} value={passwords.password} onChange={(e) => setPasswords(p => ({ ...p, password: e.target.value }))} />
            <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute top-7 right-2 p-2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
            <div className="mt-2 h-2 w-full bg-muted rounded overflow-hidden"><div className={`h-full transition-all duration-300 ${passwordStrength>0?strengthColor[passwordStrength-1]:'bg-transparent'}`} style={{ width: `${(passwordStrength/5)*100}%` }} /></div>
            <p className="text-xs text-muted-foreground mt-1">Força: {['','Fraca','Média','Razoável','Forte','Excelente'][passwordStrength]}</p>
          </div>
          <div className="relative">
            <Label htmlFor="confirm-password">Confirme a nova senha</Label>
            <Input id="confirm-password" type={showConfirm ? 'text' : 'password'} value={passwords.confirm} onChange={(e) => setPasswords(p => ({ ...p, confirm: e.target.value }))} />
            <button type="button" onClick={() => setShowConfirm(s => !s)} className="absolute top-7 right-2 p-2 text-muted-foreground hover:text-foreground" aria-label={showConfirm ? 'Ocultar confirmação' : 'Mostrar confirmação'}>{showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
          </div>
          {passwordError && <div className="text-red-600 text-sm text-center">{passwordError}</div>}
          <div className="flex gap-2 mt-4">
            <Button onClick={handlePasswordSave} className="flex-1" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
            <Button onClick={() => { setShowPasswordModal(false); setPasswords({ password: '', confirm: '' }); setPasswordError(''); }} className="flex-1" variant="outline" disabled={loading}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
