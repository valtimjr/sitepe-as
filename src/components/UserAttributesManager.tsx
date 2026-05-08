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
  const [professions, setProfessions] = useState<string[]>(['Eletricista', 'Mecânico']);
  const [shifts, setShifts] = useState<string[]>(['Turno A', 'Turno B', 'Turno C']);
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
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'user_attributes')
        .eq('company', company)
        .maybeSingle();

      if (error) throw error;

      if (data && data.value) {
        const val = data.value as any;
        if (val.professions) setProfessions(val.professions);
        if (val.shifts) setShifts(val.shifts);
      }
    } catch (err) {
      console.error('Error fetching attributes:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveAttributes = async (newProfs: string[], newShfts: string[]) => {
    setSaving(true);
    try {
      const { data } = await supabase
        .from('app_config')
        .select('id')
        .eq('key', 'user_attributes')
        .eq('company', company)
        .maybeSingle();

      const payload = { professions: newProfs, shifts: newShfts };

      if (data) {
        const { error } = await supabase
          .from('app_config')
          .update({ value: payload, updated_at: new Date().toISOString() })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('app_config')
          .insert({ key: 'user_attributes', company, value: payload });
        if (error) throw error;
      }
      showSuccess('Atributos atualizados com sucesso!');
    } catch (err) {
      console.error('Error saving attributes:', err);
      showError('Erro ao salvar atributos.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddProfession = () => {
    if (!newProfession.trim()) return;
    const updated = [...professions, newProfession.trim()];
    setProfessions(updated);
    setNewProfession('');
    saveAttributes(updated, shifts);
  };

  const handleRemoveProfession = (prof: string) => {
    const updated = professions.filter(p => p !== prof);
    setProfessions(updated);
    saveAttributes(updated, shifts);
  };

  const handleAddShift = () => {
    if (!newShift.trim()) return;
    const updated = [...shifts, newShift.trim()];
    setShifts(updated);
    setNewShift('');
    saveAttributes(professions, updated);
  };

  const handleRemoveShift = (shift: string) => {
    const updated = shifts.filter(s => s !== shift);
    setShifts(updated);
    saveAttributes(professions, updated);
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