"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Loader2, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';

interface BadgeRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  badge: string | null;
  badge_normalized: string | null;
  email: string | null;
  is_duplicate: boolean;
}

const fullName = (r: BadgeRow) => [r.first_name, r.last_name].filter(Boolean).join(' ') || 'Sem nome';

const BadgeRowItem: React.FC<{ row: BadgeRow; onSaved: () => void }> = ({ row, onSaved }) => {
  const [value, setValue] = useState(row.badge ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => setValue(row.badge ?? ''), [row.badge]);

  const dirty = value.trim() !== (row.badge ?? '').trim();

  const save = async () => {
    setSaving(true);
    setError('');
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ badge: value.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', row.id);
    setSaving(false);
    if (updateError) {
      if (updateError.message.includes('badge_taken')) setError('Este crachá já está em uso.');
      else showError('Erro ao salvar crachá: ' + updateError.message);
      return;
    }
    showSuccess(`Crachá de ${fullName(row)} atualizado.`);
    onSaved();
  };

  return (
    <li
      data-testid="badge-row"
      className={cn(
        'flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center',
        row.is_duplicate && 'border-destructive/60 bg-destructive/5'
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{fullName(row)}</p>
        <p className="truncate text-xs text-muted-foreground">{row.email ?? '—'}</p>
        {row.is_duplicate && <p className="text-xs font-semibold text-destructive">Crachá repetido</p>}
      </div>
      <form
        className="flex items-start gap-2 sm:w-56"
        onSubmit={(e) => {
          e.preventDefault();
          if (dirty) void save();
        }}
      >
        <div className="flex-1">
          <Input
            aria-label={`Crachá de ${fullName(row)}`}
            inputMode="numeric"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError('');
            }}
            placeholder="Sem crachá"
            disabled={saving}
            aria-invalid={!!error}
            className={cn(row.is_duplicate && 'border-destructive', error && 'border-destructive focus-visible:ring-destructive')}
          />
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
        <Button type="submit" size="icon" variant="outline" disabled={!dirty || saving} aria-label="Salvar crachá">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
      </form>
    </li>
  );
};

const BadgeManager: React.FC = () => {
  const [rows, setRows] = useState<BadgeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [onlyDuplicates, setOnlyDuplicates] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_list_badges');
    if (error) showError('Erro ao carregar crachás: ' + error.message);
    else setRows((data ?? []) as BadgeRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const duplicateCount = useMemo(
    () => new Set(rows.filter((r) => r.is_duplicate).map((r) => r.badge_normalized)).size,
    [rows]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyDuplicates && !r.is_duplicate) return false;
      if (!q) return true;
      return `${fullName(r)} ${r.badge ?? ''} ${r.email ?? ''}`.toLowerCase().includes(q);
    });
  }, [rows, query, onlyDuplicates]);

  return (
    <Card className="w-full rounded-none border-0 bg-transparent shadow-none lg:rounded-lg lg:border lg:bg-card lg:shadow-sm">
      <CardHeader className="hidden lg:flex">
        <CardTitle className="text-2xl font-bold">Crachás</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-0 lg:p-6 lg:pt-0">
        {duplicateCount > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex flex-wrap items-center gap-2">
              {duplicateCount} {duplicateCount === 1 ? 'crachá repetido impede' : 'crachás repetidos impedem'} o login por crachá.
              {!onlyDuplicates && (
                <Button variant="link" className="h-auto p-0 text-destructive underline" onClick={() => setOnlyDuplicates(true)}>
                  Ver repetidos
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, crachá ou e-mail"
              aria-label="Buscar crachás"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="only-duplicates" checked={onlyDuplicates} onCheckedChange={(c) => setOnlyDuplicates(c === true)} />
            <Label htmlFor="only-duplicates" className="cursor-pointer">Só repetidos</Label>
          </div>
        </div>

        {loading ? (
          <p className="py-8 text-center text-muted-foreground">Carregando crachás...</p>
        ) : visible.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">Nenhum usuário encontrado.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {visible.map((row) => (
              <BadgeRowItem key={row.id} row={row} onSaved={load} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default BadgeManager;
