"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/context/CompanyContext';
import { showSuccess, showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, Loader2 } from 'lucide-react';

export default function UserAttributesManager() {
  const { company } = useCompany();
  const [professions, setProfessions] = useState<string[]>([]);
  const [shifts, setShifts] = useState<string[]>([]);
  const [newProfession, setNewProfession] = useState('');
  const [newShift, setNewShift] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAttributes();
  }, [company]);

  const fetchAttributes = async () => {
    setLoading(true);
    try {
      const [profRes, shiftRes] = await Promise.all([
        supabase.from('professions').select('name').eq('company', company).order('name'),
        supabase.from('shifts').select('name').eq('company', company).order('name')
      ]);

      if (profRes.error) throw profRes.error;
      if (shiftRes.error) throw shiftRes.error;

      if (profRes.data) setProfessions(profRes.data.map(p => p.name));
      if (shiftRes.data) setShifts(shiftRes.data.map(s => s.name));
    } catch (err) {
      console.error('Error fetching attributes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProfession = async () => {
    const trimmed = newProfession.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('professions').insert({ name: trimmed, company });
      if (error) throw error;
      setProfessions(prev => [...prev, trimmed].sort());
      setNewProfession('');
      showSuccess('Profissão adicionada com sucesso!');
    } catch (err: any) {
      console.error(err);
      showError(`Erro ao adicionar profissão: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveProfession = async (prof: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('professions').delete().eq('name', prof).eq('company', company);
      if (error) throw error;
      setProfessions(prev => prev.filter(p => p !== prof));
      showSuccess('Profissão removida!');
    } catch (err: any) {
      console.error(err);
      showError(`Erro ao remover profissão: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddShift = async () => {
    const trimmed = newShift.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('shifts').insert({ name: trimmed, company });
      if (error) throw error;
      setShifts(prev => [...prev, trimmed].sort());
      setNewShift('');
      showSuccess('Turno adicionado com sucesso!');
    } catch (err: any) {
      console.error(err);
      showError(`Erro ao adicionar turno: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveShift = async (shift: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('shifts').delete().eq('name', shift).eq('company', company);
      if (error) throw error;
      setShifts(prev => prev.filter(s => s !== shift));
      showSuccess('Turno removido!');
    } catch (err: any) {
      console.error(err);
      showError(`Erro ao remover turno: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Profissões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input 
              placeholder="Nova profissão..." 
              value={newProfession} 
              onChange={e => setNewProfession(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddProfession()}
              disabled={saving}
            />
            <Button onClick={handleAddProfession} disabled={saving || !newProfession.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ul className="space-y-2">
            {professions.map(prof => (
              <li key={prof} className="flex justify-between items-center bg-muted/50 p-2 rounded">
                <span>{prof}</span>
                <Button variant="ghost" size="sm" onClick={() => handleRemoveProfession(prof)} disabled={saving}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
            {professions.length === 0 && <li className="text-muted-foreground text-sm">Nenhuma profissão cadastrada.</li>}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Turnos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input 
              placeholder="Novo turno..." 
              value={newShift} 
              onChange={e => setNewShift(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddShift()}
              disabled={saving}
            />
            <Button onClick={handleAddShift} disabled={saving || !newShift.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ul className="space-y-2">
            {shifts.map(shift => (
              <li key={shift} className="flex justify-between items-center bg-muted/50 p-2 rounded">
                <span>{shift}</span>
                <Button variant="ghost" size="sm" onClick={() => handleRemoveShift(shift)} disabled={saving}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
            {shifts.length === 0 && <li className="text-muted-foreground text-sm">Nenhum turno cadastrado.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}