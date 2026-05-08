"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/context/CompanyContext';
import { showSuccess, showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, Loader2, Edit2, Check, X } from 'lucide-react';

export default function UserAttributesManager() {
  const { company } = useCompany();
  const [professions, setProfessions] = useState<string[]>([]);
  const [shifts, setShifts] = useState<string[]>([]);
  const [newProfession, setNewProfession] = useState('');
  const [newShift, setNewShift] = useState('');
  
  // Estados para edição
  const [editingProfession, setEditingProfession] = useState<string | null>(null);
  const [editProfessionValue, setEditProfessionValue] = useState('');
  const [editingShift, setEditingShift] = useState<string | null>(null);
  const [editShiftValue, setEditShiftValue] = useState('');

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

  const handleEditProfession = async (oldName: string) => {
    const trimmed = editProfessionValue.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingProfession(null);
      return;
    }
    setSaving(true);
    try {
      // 1. Atualiza na tabela de profissões
      const { error: updateError } = await supabase
        .from('professions')
        .update({ name: trimmed })
        .eq('name', oldName)
        .eq('company', company);
      if (updateError) throw updateError;

      // 2. Atualiza em todos os perfis de usuários que usavam a antiga
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ profession: trimmed })
        .eq('profession', oldName);
      
      if (profileError) {
        console.error('Erro ao atualizar perfis em cascata:', profileError);
      }

      setProfessions(prev => prev.map(p => p === oldName ? trimmed : p).sort());
      setEditingProfession(null);
      showSuccess('Profissão atualizada com sucesso!');
    } catch (err: any) {
      console.error(err);
      showError(`Erro ao editar profissão: ${err.message}`);
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

  const handleEditShift = async (oldName: string) => {
    const trimmed = editShiftValue.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingShift(null);
      return;
    }
    setSaving(true);
    try {
      // 1. Atualiza na tabela de turnos
      const { error: updateError } = await supabase
        .from('shifts')
        .update({ name: trimmed })
        .eq('name', oldName)
        .eq('company', company);
      if (updateError) throw updateError;

      // 2. Atualiza em todos os perfis de usuários que usavam o antigo
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ shift: trimmed })
        .eq('shift', oldName);
      
      if (profileError) {
        console.error('Erro ao atualizar perfis em cascata:', profileError);
      }

      setShifts(prev => prev.map(s => s === oldName ? trimmed : s).sort());
      setEditingShift(null);
      showSuccess('Turno atualizado com sucesso!');
    } catch (err: any) {
      console.error(err);
      showError(`Erro ao editar turno: ${err.message}`);
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
              <li key={prof} className="flex justify-between items-center bg-muted/50 p-2 rounded h-12">
                {editingProfession === prof ? (
                  <div className="flex items-center gap-2 w-full">
                    <Input 
                      value={editProfessionValue}
                      onChange={e => setEditProfessionValue(e.target.value)}
                      className="h-8 flex-1"
                      autoFocus
                      disabled={saving}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleEditProfession(prof);
                        if (e.key === 'Escape') setEditingProfession(null);
                      }}
                    />
                    <Button size="sm" variant="ghost" onClick={() => handleEditProfession(prof)} disabled={saving}>
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingProfession(null)} disabled={saving}>
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="truncate pr-2">{prof}</span>
                    <div className="flex gap-1 shrink-0">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setEditingProfession(prof); setEditProfessionValue(prof); }} 
                        disabled={saving}
                      >
                        <Edit2 className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveProfession(prof)} disabled={saving}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </>
                )}
              </li>
            ))}
            {professions.length === 0 && <li className="text-muted-foreground text-sm py-2">Nenhuma profissão cadastrada.</li>}
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
              <li key={shift} className="flex justify-between items-center bg-muted/50 p-2 rounded h-12">
                {editingShift === shift ? (
                  <div className="flex items-center gap-2 w-full">
                    <Input 
                      value={editShiftValue}
                      onChange={e => setEditShiftValue(e.target.value)}
                      className="h-8 flex-1"
                      autoFocus
                      disabled={saving}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleEditShift(shift);
                        if (e.key === 'Escape') setEditingShift(null);
                      }}
                    />
                    <Button size="sm" variant="ghost" onClick={() => handleEditShift(shift)} disabled={saving}>
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingShift(null)} disabled={saving}>
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="truncate pr-2">{shift}</span>
                    <div className="flex gap-1 shrink-0">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setEditingShift(shift); setEditShiftValue(shift); }} 
                        disabled={saving}
                      >
                        <Edit2 className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveShift(shift)} disabled={saving}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </>
                )}
              </li>
            ))}
            {shifts.length === 0 && <li className="text-muted-foreground text-sm py-2">Nenhum turno cadastrado.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}