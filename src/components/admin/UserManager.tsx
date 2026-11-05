import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronRight, Filter, Search, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ResponsiveSheetContent from '@/components/responsive/ResponsiveSheetContent';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/context/CompanyContext';
import { useIsCompact } from '@/hooks/use-compact';
import { showError } from '@/utils/toast';
import { tap } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import UserEditSheet from './users/UserEditSheet';
import {
  AdminUser,
  AttributeOption,
  ROLE_LABELS,
  UserRole,
  attributeLabel,
  fullName,
  initials,
  markDuplicates,
} from './users/userTypes';

type BadgeStatus = 'all' | 'duplicate' | 'missing';

interface Filters {
  q: string;
  role: 'all' | UserRole;
  profession: string;
  shift: string;
  badge: BadgeStatus;
}

const EMPTY_FILTERS: Filters = { q: '', role: 'all', profession: 'all', shift: 'all', badge: 'all' };

const activeFilterCount = (f: Filters) =>
  [f.role !== 'all', f.profession !== 'all', f.shift !== 'all', f.badge !== 'all'].filter(Boolean).length;

const hasBadge = (u: AdminUser) => !!u.badge?.trim();

// ---------- Filtros (inline no computador, gaveta no celular) ----------

const FilterSelect: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  stacked: boolean;
}> = ({ label, value, onChange, options, stacked }) => (
  <div className={cn('min-w-0', stacked ? 'space-y-1.5' : 'w-40')}>
    {stacked && <Label>{label}</Label>}
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const UserFilters: React.FC<{
  filters: Filters;
  onChange: (f: Filters) => void;
  professions: AttributeOption[];
  shifts: AttributeOption[];
  stacked?: boolean;
}> = ({ filters, onChange, professions, shifts, stacked = false }) => {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...filters, [k]: v });
  return (
    <div className={cn(stacked ? 'flex flex-col gap-4' : 'flex flex-wrap items-center gap-2')}>
      <FilterSelect
        label="Função"
        stacked={stacked}
        value={filters.role}
        onChange={(v) => set('role', v as Filters['role'])}
        options={[{ value: 'all', label: 'Todas as funções' }, ...(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => ({ value: r, label: ROLE_LABELS[r] }))]}
      />
      <FilterSelect
        label="Profissão"
        stacked={stacked}
        value={filters.profession}
        onChange={(v) => set('profession', v)}
        options={[{ value: 'all', label: 'Todas as profissões' }, ...professions.map((p) => ({ value: String(p.ref_code), label: p.name }))]}
      />
      <FilterSelect
        label="Turno"
        stacked={stacked}
        value={filters.shift}
        onChange={(v) => set('shift', v)}
        options={[{ value: 'all', label: 'Todos os turnos' }, ...shifts.map((s) => ({ value: String(s.ref_code), label: s.name }))]}
      />
      <FilterSelect
        label="Situação do crachá"
        stacked={stacked}
        value={filters.badge}
        onChange={(v) => set('badge', v as BadgeStatus)}
        options={[
          { value: 'all', label: 'Todos os crachás' },
          { value: 'duplicate', label: 'Repetido' },
          { value: 'missing', label: 'Sem crachá' },
        ]}
      />
    </div>
  );
};

// ---------- Linha (lista no celular, tabela no computador) ----------

interface RowProps {
  user: AdminUser;
  professionMap: Map<number, string>;
  shiftMap: Map<number, string>;
  onOpen: (u: AdminUser) => void;
}

const UserAvatar: React.FC<{ user: AdminUser; className?: string }> = ({ user, className }) => (
  <Avatar className={cn('h-10 w-10 shrink-0', className)}>
    {user.avatar_url && <AvatarImage src={user.avatar_url} alt="" />}
    <AvatarFallback className="text-xs font-semibold">{initials(user)}</AvatarFallback>
  </Avatar>
);

const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) =>
  role === 'user' ? null : (
    <Badge variant={role === 'admin' ? 'default' : 'secondary'} className="shrink-0">{ROLE_LABELS[role]}</Badge>
  );

const BadgeStatusText: React.FC<{ user: AdminUser }> = ({ user }) => {
  if (user.is_duplicate)
    return (
      <span className="inline-flex items-center gap-1 font-semibold text-destructive">
        <AlertTriangle className="h-3 w-3" /> Crachá repetido #{user.badge}
      </span>
    );
  if (!hasBadge(user)) return <span className="font-medium text-amber-600 dark:text-amber-400">Sem crachá</span>;
  return <span>#{user.badge}</span>;
};

const UserRow: React.FC<RowProps & { compact: boolean }> = ({ user, professionMap, shiftMap, onOpen, compact }) => {
  const profession = attributeLabel(user.profession_code, professionMap);
  const shift = attributeLabel(user.shift_code, shiftMap);
  const open = () => {
    tap();
    onOpen(user);
  };

  if (compact) {
    return (
      <li>
        <button
          type="button"
          data-testid="user-row"
          onClick={open}
          className={cn(
            'flex min-h-14 w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors active:bg-muted',
            user.is_duplicate && 'border-destructive/60 bg-destructive/5'
          )}
        >
          <UserAvatar user={user} />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-medium">{fullName(user)}</span>
              <RoleBadge role={user.role} />
            </div>
            <p className="truncate text-xs text-muted-foreground">
              <BadgeStatusText user={user} />
              {[profession, shift].filter(Boolean).map((t) => ` · ${t}`)}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </li>
    );
  }

  return (
    <TableRow
      data-testid="user-row"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
      className={cn('cursor-pointer', user.is_duplicate && 'bg-destructive/5')}
    >
      <TableCell>
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar user={user} className="h-8 w-8" />
          <div className="min-w-0">
            <p className="truncate font-medium">{fullName(user)}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email ?? '—'}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-sm"><BadgeStatusText user={user} /></TableCell>
      <TableCell className="text-sm">{profession ?? <span className="text-muted-foreground">—</span>}</TableCell>
      <TableCell className="text-sm">{shift ?? <span className="text-muted-foreground">—</span>}</TableCell>
      <TableCell>{user.role === 'user' ? <span className="text-sm text-muted-foreground">Usuário</span> : <RoleBadge role={user.role} />}</TableCell>
    </TableRow>
  );
};

// ---------- Seção ----------

const CounterChip: React.FC<{ active: boolean; onClick: () => void; tone?: 'danger' | 'warn'; testId: string; children: React.ReactNode }> = ({
  active,
  onClick,
  tone,
  testId,
  children,
}) => (
  <button
    type="button"
    data-testid={testId}
    aria-pressed={active}
    onClick={onClick}
    className={cn(
      'inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-medium transition-colors',
      tone === 'danger' && 'border-destructive/40 text-destructive',
      tone === 'warn' && 'border-amber-500/40 text-amber-700 dark:text-amber-400',
      active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'
    )}
  >
    {children}
  </button>
);

const UserManager: React.FC = () => {
  const { profile, refreshProfile } = useSession();
  const { company } = useCompany();
  const isCompact = useIsCompact();
  const isAdmin = profile?.role === 'admin';

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [professions, setProfessions] = useState<AttributeOption[]>([]);
  const [shifts, setShifts] = useState<AttributeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);

  const load = useCallback(async () => {
    const [usersRes, profRes, shiftRes] = await Promise.all([
      supabase.rpc('admin_list_users'),
      supabase.from('professions').select('name, ref_code').eq('company', company).not('ref_code', 'is', null).order('name'),
      supabase.from('shifts').select('name, ref_code').eq('company', company).not('ref_code', 'is', null).order('name'),
    ]);
    if (usersRes.error) showError('Erro ao carregar usuários: ' + usersRes.error.message);
    else setUsers((usersRes.data ?? []) as AdminUser[]);
    setProfessions((profRes.data ?? []) as AttributeOption[]);
    setShifts((shiftRes.data ?? []) as AttributeOption[]);
    setLoading(false);
  }, [company]);

  useEffect(() => {
    void load();
  }, [load]);

  const professionMap = useMemo(() => new Map(professions.map((p) => [p.ref_code, p.name])), [professions]);
  const shiftMap = useMemo(() => new Map(shifts.map((s) => [s.ref_code, s.name])), [shifts]);

  const duplicateCount = useMemo(() => users.filter((u) => u.is_duplicate).length, [users]);
  const missingCount = useMemo(() => users.filter((u) => !hasBadge(u)).length, [users]);

  const visible = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return users.filter((u) => {
      if (filters.role !== 'all' && u.role !== filters.role) return false;
      if (filters.profession !== 'all' && String(u.profession_code) !== filters.profession) return false;
      if (filters.shift !== 'all' && String(u.shift_code) !== filters.shift) return false;
      if (filters.badge === 'duplicate' && !u.is_duplicate) return false;
      if (filters.badge === 'missing' && hasBadge(u)) return false;
      if (!q) return true;
      return `${fullName(u)} ${u.badge ?? ''} ${u.email ?? ''}`.toLowerCase().includes(q);
    });
  }, [users, filters]);

  const filterCount = activeFilterCount(filters);
  const anyFilter = filterCount > 0 || !!filters.q.trim();
  const clearFilters = () => setFilters(EMPTY_FILTERS);
  const toggleBadgeFilter = (status: BadgeStatus) =>
    setFilters((f) => ({ ...f, badge: f.badge === status ? 'all' : status }));

  const handleSaved = (updated: AdminUser) => {
    setUsers((prev) => markDuplicates(prev.map((u) => (u.id === updated.id ? updated : u))));
    setEditing(null);
    if (updated.id === profile?.id) void refreshProfile();
  };

  const rowProps = { professionMap, shiftMap, onOpen: setEditing, compact: isCompact };

  return (
    <Card className="w-full rounded-none border-0 bg-transparent shadow-none lg:rounded-lg lg:border lg:bg-card lg:shadow-sm">
      <CardHeader className="hidden lg:flex">
        <CardTitle className="flex items-center gap-2 text-2xl font-bold">
          <Users className="h-6 w-6" /> Usuários
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-0 lg:p-6 lg:pt-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 lg:min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="Buscar nome, crachá ou e-mail"
              aria-label="Buscar usuários"
              className="pl-9"
            />
          </div>
          {isCompact ? (
            <Button
              variant="outline"
              size="icon"
              className="relative shrink-0"
              onClick={() => setFiltersOpen(true)}
              aria-label="Filtros"
              data-testid="user-filters-button"
            >
              <Filter className="h-4 w-4" />
              {filterCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {filterCount}
                </span>
              )}
            </Button>
          ) : (
            <UserFilters filters={filters} onChange={setFilters} professions={professions} shifts={shifts} />
          )}
          {!isCompact && filterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar filtros</Button>
          )}
        </div>

        {!loading && (
          <div className="flex flex-wrap gap-2">
            <CounterChip testId="user-counter-total" active={!anyFilter} onClick={clearFilters}>
              {users.length} {users.length === 1 ? 'usuário' : 'usuários'}
            </CounterChip>
            {duplicateCount > 0 && (
              <CounterChip testId="user-counter-duplicates" tone="danger" active={filters.badge === 'duplicate'} onClick={() => toggleBadgeFilter('duplicate')}>
                <AlertTriangle className="h-3 w-3" /> {duplicateCount} {duplicateCount === 1 ? 'repetido' : 'repetidos'}
              </CounterChip>
            )}
            {missingCount > 0 && (
              <CounterChip testId="user-counter-missing" tone="warn" active={filters.badge === 'missing'} onClick={() => toggleBadgeFilter('missing')}>
                {missingCount} sem crachá
              </CounterChip>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-2" data-testid="user-list-loading">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
            <p>Nenhum usuário encontrado.</p>
            {anyFilter && <Button variant="outline" size="sm" onClick={clearFilters}>Limpar filtros</Button>}
          </div>
        ) : isCompact ? (
          <ul className="flex flex-col gap-2" data-testid="user-list">
            {visible.map((u) => <UserRow key={u.id} user={u} {...rowProps} />)}
          </ul>
        ) : (
          <div className="rounded-md border">
            <Table data-testid="user-list">
              <TableHeader>
                <TableRow>
                  <TableHead>Nome / e-mail</TableHead>
                  <TableHead>Crachá</TableHead>
                  <TableHead>Profissão</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Função</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((u) => <UserRow key={u.id} user={u} {...rowProps} />)}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {isCompact && (
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <ResponsiveSheetContent data-testid="user-filters-sheet">
            <SheetHeader className="mb-4 text-left">
              <SheetTitle>Filtros</SheetTitle>
              <SheetDescription className="sr-only">Filtrar a lista de usuários</SheetDescription>
            </SheetHeader>
            <UserFilters filters={filters} onChange={setFilters} professions={professions} shifts={shifts} stacked />
            <div className="mt-6 flex gap-2">
              {filterCount > 0 && (
                <Button variant="outline" className="flex-1" onClick={clearFilters}>Limpar filtros</Button>
              )}
              <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
                Ver {visible.length} {visible.length === 1 ? 'usuário' : 'usuários'}
              </Button>
            </div>
          </ResponsiveSheetContent>
        </Sheet>
      )}

      <UserEditSheet
        user={editing}
        users={users}
        professions={professions}
        shifts={shifts}
        isAdmin={isAdmin}
        currentUserId={profile?.id}
        onClose={() => setEditing(null)}
        onSaved={handleSaved}
      />
    </Card>
  );
};

export default UserManager;
