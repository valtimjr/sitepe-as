import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Copy, Loader2, Lock } from 'lucide-react';
import { Sheet, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import ResponsiveSheetContent from '@/components/responsive/ResponsiveSheetContent';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { normalizeBadge } from '@/lib/badge';
import { cn } from '@/lib/utils';
import { AdminUser, AttributeOption, ROLE_LABELS, UserRole, fullName, initials } from './userTypes';

interface Draft {
  first_name: string;
  last_name: string;
  avatar_url: string;
  badge: string;
  profession_code: string;
  shift_code: string;
  role: UserRole;
  suggest_parts: boolean;
  auto_fill_timesheet: boolean;
}

type Patch = Partial<Pick<AdminUser, 'first_name' | 'last_name' | 'avatar_url' | 'badge' | 'profession_code' | 'shift_code' | 'role' | 'suggest_parts' | 'auto_fill_timesheet'>>;

const NONE = 'none';

const toDraft = (u: AdminUser): Draft => ({
  first_name: u.first_name ?? '',
  last_name: u.last_name ?? '',
  avatar_url: u.avatar_url ?? '',
  badge: u.badge ?? '',
  profession_code: u.profession_code == null ? NONE : String(u.profession_code),
  shift_code: u.shift_code == null ? NONE : String(u.shift_code),
  role: u.role,
  suggest_parts: u.suggest_parts ?? true,
  auto_fill_timesheet: u.auto_fill_timesheet,
});

const text = (v: string) => v.trim() || null;
const code = (v: string) => (v === NONE ? null : Number(v));

/** Só os campos que mudaram (moderador só envia o crachá). */
const buildPatch = (u: AdminUser, d: Draft, isAdmin: boolean): Patch => {
  const patch: Patch = {};
  if (text(d.badge) !== (u.badge?.trim() || null)) patch.badge = text(d.badge);
  if (!isAdmin) return patch;
  if (text(d.first_name) !== (u.first_name?.trim() || null)) patch.first_name = text(d.first_name);
  if (text(d.last_name) !== (u.last_name?.trim() || null)) patch.last_name = text(d.last_name);
  if (text(d.avatar_url) !== (u.avatar_url?.trim() || null)) patch.avatar_url = text(d.avatar_url);
  if (code(d.profession_code) !== u.profession_code) patch.profession_code = code(d.profession_code);
  if (code(d.shift_code) !== u.shift_code) patch.shift_code = code(d.shift_code);
  if (d.role !== u.role) patch.role = d.role;
  if (d.suggest_parts !== (u.suggest_parts ?? true)) patch.suggest_parts = d.suggest_parts;
  if (d.auto_fill_timesheet !== u.auto_fill_timesheet) patch.auto_fill_timesheet = d.auto_fill_timesheet;
  return patch;
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</h3>
);

const FieldLabel: React.FC<{ htmlFor?: string; locked?: boolean; children: React.ReactNode }> = ({ htmlFor, locked, children }) => (
  <Label htmlFor={htmlFor} className="flex items-center gap-1">
    {children}
    {locked && <Lock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />}
  </Label>
);

const AttributeSelect: React.FC<{
  id: string;
  label: string;
  emptyLabel: string;
  value: string;
  options: AttributeOption[];
  disabled: boolean;
  onChange: (v: string) => void;
}> = ({ id, label, emptyLabel, value, options, disabled, onChange }) => {
  const unknown = value !== NONE && !options.some((o) => String(o.ref_code) === value);
  return (
    <div className="min-w-0 space-y-1.5">
      <FieldLabel htmlFor={id} locked={disabled}>{label}</FieldLabel>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{emptyLabel}</SelectItem>
          {unknown && <SelectItem value={value}>Código {value} (não encontrado)</SelectItem>}
          {options.map((o) => (
            <SelectItem key={o.ref_code} value={String(o.ref_code)}>{o.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

interface Props {
  user: AdminUser | null;
  users: AdminUser[];
  professions: AttributeOption[];
  shifts: AttributeOption[];
  isAdmin: boolean;
  currentUserId: string | undefined;
  onClose: () => void;
  onSaved: (updated: AdminUser) => void;
}

const UserEditSheet: React.FC<Props> = ({ user, users, professions, shifts, isAdmin, currentUserId, onClose, onSaved }) => {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [badgeError, setBadgeError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmAdmin, setConfirmAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      setDraft(toDraft(user));
      setBadgeError('');
    }
  }, [user]);

  const patch = useMemo(() => (user && draft ? buildPatch(user, draft, isAdmin) : {}), [user, draft, isAdmin]);
  const dirty = Object.keys(patch).length > 0;

  const badgeOwner = useMemo(() => {
    const norm = normalizeBadge(draft?.badge);
    if (!user || !norm) return null;
    return users.find((u) => u.id !== user.id && normalizeBadge(u.badge) === norm) ?? null;
  }, [draft?.badge, users, user]);

  const isSelf = !!user && user.id === currentUserId;
  const locked = !isAdmin;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  const requestClose = () => {
    if (dirty && !saving) setConfirmDiscard(true);
    else onClose();
  };

  const copyEmail = async () => {
    if (!user?.email) return;
    try {
      await navigator.clipboard.writeText(user.email);
      showSuccess('E-mail copiado.');
    } catch {
      showError('Não foi possível copiar o e-mail.');
    }
  };

  const save = async () => {
    if (!user || !dirty || badgeOwner) return;
    setSaving(true);
    setBadgeError('');
    const { error } = await supabase
      .from('profiles')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      if (error.message.includes('badge_taken')) setBadgeError('Este crachá já está em uso.');
      else showError('Erro ao salvar usuário: ' + error.message);
      return;
    }
    showSuccess(`${fullName({ ...user, ...patch })} atualizado.`);
    onSaved({ ...user, ...patch });
  };

  const preview = draft ? { first_name: draft.first_name, last_name: draft.last_name } : null;

  return (
    <>
      <Sheet open={!!user} onOpenChange={(open) => !open && requestClose()}>
        <ResponsiveSheetContent fixedHeight className="w-full sm:max-w-lg" data-testid="user-edit-sheet">
          {user && draft && preview && (
            <>
              <SheetHeader className="space-y-3 border-b p-4 pr-12 text-left sm:p-6 sm:pr-12">
                <SheetTitle>Editar usuário</SheetTitle>
                <SheetDescription className="sr-only">Dados do perfil de {fullName(user)}</SheetDescription>
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-12 w-12">
                    {draft.avatar_url && <AvatarImage src={draft.avatar_url} alt="" />}
                    <AvatarFallback>{initials(preview)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{fullName(preview)}</p>
                    <div className="flex min-w-0 items-center gap-1">
                      <p className="truncate text-sm text-muted-foreground">{user.email ?? 'Sem e-mail'}</p>
                      {user.email && (
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copyEmail} aria-label="Copiar e-mail">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <form
                id="user-edit-form"
                className="flex-1 space-y-6 overflow-y-auto overscroll-contain p-4 sm:p-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  void save();
                }}
              >
                <section className="space-y-3">
                  <SectionTitle>Identificação</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="min-w-0 space-y-1.5">
                      <FieldLabel htmlFor="user-first-name" locked={locked}>Nome</FieldLabel>
                      <Input id="user-first-name" value={draft.first_name} onChange={(e) => set('first_name', e.target.value)} disabled={locked} />
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <FieldLabel htmlFor="user-last-name" locked={locked}>Sobrenome</FieldLabel>
                      <Input id="user-last-name" value={draft.last_name} onChange={(e) => set('last_name', e.target.value)} disabled={locked} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="user-avatar" locked={locked}>URL do avatar</FieldLabel>
                    <Input
                      id="user-avatar"
                      type="url"
                      inputMode="url"
                      placeholder="https://..."
                      value={draft.avatar_url}
                      onChange={(e) => set('avatar_url', e.target.value)}
                      disabled={locked}
                    />
                  </div>
                </section>

                <section className="space-y-3">
                  <SectionTitle>Crachá</SectionTitle>
                  <div className="space-y-1.5">
                    <Label htmlFor="user-badge">Número do crachá</Label>
                    <Input
                      id="user-badge"
                      inputMode="numeric"
                      placeholder="Sem crachá"
                      value={draft.badge}
                      onChange={(e) => {
                        set('badge', e.target.value);
                        if (badgeError) setBadgeError('');
                      }}
                      aria-invalid={!!badgeOwner || !!badgeError}
                      className={cn((badgeOwner || badgeError) && 'border-destructive focus-visible:ring-destructive')}
                    />
                    {badgeOwner && (
                      <p className="flex items-center gap-1 text-xs font-medium text-destructive" data-testid="badge-taken-warning">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Já usado por {fullName(badgeOwner)}
                      </p>
                    )}
                    {!badgeOwner && badgeError && <p className="text-xs text-destructive">{badgeError}</p>}
                  </div>
                </section>

                <section className="space-y-3">
                  <SectionTitle>Trabalho</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <AttributeSelect
                      id="user-profession"
                      label="Profissão"
                      emptyLabel="Sem profissão"
                      value={draft.profession_code}
                      options={professions}
                      disabled={locked}
                      onChange={(v) => set('profession_code', v)}
                    />
                    <AttributeSelect
                      id="user-shift"
                      label="Turno"
                      emptyLabel="Sem turno"
                      value={draft.shift_code}
                      options={shifts}
                      disabled={locked}
                      onChange={(v) => set('shift_code', v)}
                    />
                  </div>
                </section>

                <section className="space-y-3">
                  <SectionTitle>Função</SectionTitle>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    value={draft.role}
                    onValueChange={(v) => {
                      if (!v) return;
                      if (v === 'admin' && user.role !== 'admin') setConfirmAdmin(true);
                      else set('role', v as UserRole);
                    }}
                    disabled={locked || isSelf}
                    className="grid grid-cols-3"
                    aria-label="Função"
                    data-testid="user-role-toggle"
                  >
                    {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                      <ToggleGroupItem key={r} value={r} className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                        {ROLE_LABELS[r]}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  {locked ? (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" /> Só administradores alteram a função.</p>
                  ) : isSelf ? (
                    <p className="text-xs text-muted-foreground">Você não pode alterar a própria função, para não perder o acesso.</p>
                  ) : null}
                </section>

                <section className="space-y-3">
                  <SectionTitle>Preferências</SectionTitle>
                  <div className="flex items-center justify-between gap-3">
                    <FieldLabel htmlFor="user-suggest-parts" locked={locked}>Sugestão de peças</FieldLabel>
                    <Switch id="user-suggest-parts" checked={draft.suggest_parts} onCheckedChange={(c) => set('suggest_parts', c)} disabled={locked} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <FieldLabel htmlFor="user-auto-fill" locked={locked}>Preencher ponto automático</FieldLabel>
                      <Switch id="user-auto-fill" checked={draft.auto_fill_timesheet} onCheckedChange={(c) => set('auto_fill_timesheet', c)} disabled={locked} />
                    </div>
                    {draft.auto_fill_timesheet && draft.shift_code === NONE && (
                      <p className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Precisa de um turno para funcionar
                      </p>
                    )}
                  </div>
                </section>
              </form>

              <div className="flex gap-2 border-t bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <Button type="button" variant="outline" className="flex-1" onClick={requestClose} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="submit" form="user-edit-form" className="flex-1" disabled={!dirty || !!badgeOwner || saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
                </Button>
              </div>
            </>
          )}
        </ResponsiveSheetContent>
      </Sheet>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>As mudanças feitas neste usuário não foram salvas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={onClose}>Descartar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAdmin} onOpenChange={setConfirmAdmin}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tornar administrador?</AlertDialogTitle>
            <AlertDialogDescription>Administradores têm acesso total ao Painel, incluindo peças, menus e funções de outros usuários.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => set('role', 'admin')}>Tornar admin</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserEditSheet;
