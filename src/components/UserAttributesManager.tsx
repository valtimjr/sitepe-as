"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/context/CompanyContext';
import { showSuccess, showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, Loader2, Edit2, Check, X } from 'lucide-react';

type AttributeItem = { id: string; name: string; ref_code: number };

export default function UserAttributesManager() {
  const { company } = useCompany();
  const [professions, setProfessions] = useState<AttributeItem[]>([]);
  const [shifts, setShifts] = useState<AttributeItem[]>([]);
  
  const [newProfession, setNewProfession] = useState('');
  const [newProfessionCode, setNewProfessionCode] = useState('');
  
  const [newShift, setNewShift] = useState('');
  const [newShiftCode, setNewShiftCode] = useState('');
  
  const [editingProfession, setEditingProfession] = useState<string | null>(null);
  const [editProfessionValue, setEditProfessionValue] = useState('');
  const [editProfessionCodeValue, setEditProfessionCodeValue] = useState('');

  const [editingShift, setEditingShift] = useState<string | null>(null);
  const [editShiftValue, setEditShiftValue] = useState('');
  const [editShiftCodeValue, setEditShiftCodeValue] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAttributes();
  }, [company]);

  const fetchAttributes = async () => {
    setLoading(true);
    try {
      const [profRes, shiftRes] = await Promise.all([
        supabase.from('professions').select('id, name, ref_code').eq('company', company).order('name'),
        supabase.from('shifts').select('id, name, ref_code').eq('company', company).order('name')
      ]);

      if (profRes.error) throw profRes.error;
      if (shiftRes.error) throw shiftRes.error;

      if (profRes.data) setProfessions(profRes.data as AttributeItem[]);
      if (shiftRes.data) setShifts(shiftRes.data as AttributeItem[]);
    } catch (err) {
      console.error('Error fetching attributes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProfession = async () => {
    const trimmed = newProfession.trim();
    if (!trimmed || !newProfessionCode) {
      showError("Nome e Código são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      const code = parseInt(newProfessionCode);
      const { data, error } = await supabase.from('professions').insert({ name: trimmed, ref_code: code, company }).select('id, name, ref_code').single();
      if (error) throw error;
      setProfessions(prev => [...prev, data as AttributeItem].sort((a, b) => a.name.localeCompare(b.name)));
      setNewProfession('');
      setNewProfessionCode('');
      showSuccess('Profissão adicionada com sucesso!');
    } catch (err: any) {
      console.error(err);
      showError(`Erro ao adicionar profissão: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditProfession = async (id: string) => {
    const trimmed = editProfessionValue.trim();
    const code = editProfessionCodeValue ? parseInt(editProfessionCodeValue) : null;
    if (!trimmed || code === null) {
      showError("Nome e Código são obrigatórios.");
      return;
    }
    
    setSaving(true);
    try {
      // Como o profile depende apenas do ref_code, só precisamos atualizar aqui!
      const { error: updateError } = await supabase
        .from('professions')
        .update({ name: trimmed, ref_code: code })
        .eq('id', id);
        
      if (updateError) throw updateError;

      setProfessions(prev => prev.map(p => p.id === id ? { ...p, name: trimmed, ref_code: code } : p).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingProfession(null);
      showSuccess('Profissão atualizada com sucesso!');
    } catch (err: any) {
      console.error(err);
      showError(`Erro ao editar profissão: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveProfession = async (id: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('professions').delete().eq('id', id);
      if (error) throw error;
      setProfessions(prev => prev.filter(p => p.id !== id));
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
    if (!trimmed || !newShiftCode) {
      showError("Nome e Código são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      const code = parseInt(newShiftCode);
      const { data, error } = await supabase.from('shifts').insert({ name: trimmed, ref_code: code, company }).select('id, name, ref_code').single();
      if (error) throw error;
      setShifts(prev => [...prev, data as AttributeItem].sort((a, b) => a.name.localeCompare(b.name)));
      setNewShift('');
      setNewShiftCode('');
      showSuccess('Turno adicionado com sucesso!');
    } catch (err: any) {
      console.error(err);
      showError(`Erro ao adicionar turno: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditShift = async (id: string) => {
    const trimmed = editShiftValue.trim();
    const code = editShiftCodeValue ? parseInt(editShiftCodeValue) : null;
    
    if (!trimmed || code === null) {
      showError("Nome e Código são obrigatórios.");
      return;
    }
    
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('shifts')
        .update({ name: trimmed, ref_code: code })
        .eq('id', id);
        
      if (updateError) throw updateError;

      setShifts(prev => prev.map(s => s.id === id ? { ...s, name: trimmed, ref_code: code } : s).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingShift(null);
      showSuccess('Turno atualizado com sucesso!');
    } catch (err: any) {
      console.error(err);
      showError(`Erro ao editar turno: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveShift = async (id: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('shifts').delete().eq('id', id);
      if (error) throw error;
      setShifts(prev => prev.filter(s => s.id !== id));
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
              placeholder="Cód *" 
              value={newProfessionCode} 
              onChange={e => setNewProfessionCode(e.target.value)}
              className="w-24"
              type="number"
              disabled={saving}
            />
            <Input 
              placeholder="Nova profissão..." 
              value={newProfession} 
              onChange={e => setNewProfession(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddProfession()}
              disabled={saving}
            />
            <Button onClick={handleAddProfession} disabled={saving || !newProfession.trim() || !newProfessionCode}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ul className="space-y-2">
            {professions.map(prof => (
              <li key={prof.id} className="flex justify-between items-center bg-muted/50 p-2 rounded h-12">
                {editingProfession === prof.id ? (
                  <div className="flex items-center gap-2 w-full">
                    <Input 
                      placeholder="Cód"
                      type="number"
                      value={editProfessionCodeValue}
                      onChange={e => setEditProfessionCodeValue(e.target.value)}
                      className="h-8 w-16 px-2"
                      disabled={saving}
                    />
                    <Input 
                      value={editProfessionValue}
                      onChange={e => setEditProfessionValue(e.target.value)}
                      className="h-8 flex-1"
                      autoFocus
                      disabled={saving}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleEditProfession(prof.id);
                        if (e.key === 'Escape') setEditingProfession(null);
                      }}
                    />
                    <Button size="sm" variant="ghost" onClick={() => handleEditProfession(prof.id)} disabled={saving}>
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingProfession(null)} disabled={saving}>
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 truncate">
                      {prof.ref_code !== null && (
                        <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">
                          {prof.ref_code}
                        </span>
                      )}
                      <span className="truncate pr-2">{prof.name}</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { 
                          setEditingProfession(prof.id); 
                          setEditProfessionValue(prof.name); 
                          setEditProfessionCodeValue(prof.ref_code ? prof.ref_code.toString() : '');
                        }} 
                        disabled={saving}
                      >
                        <Edit2 className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveProfession(prof.id)} disabled={saving}>
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
              placeholder="Cód *" 
              value={newShiftCode} 
              onChange={e => setNewShiftCode(e.target.value)}
              className="w-24"
              type="number"
              disabled={saving}
            />
            <Input 
              placeholder="Novo turno..." 
              value={newShift} 
              onChange={e => setNewShift(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddShift()}
              disabled={saving}
            />
            <Button onClick={handleAddShift} disabled={saving || !newShift.trim() || !newShiftCode}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ul className="space-y-2">
            {shifts.map(shift => (
              <li key={shift.id} className="flex justify-between items-center bg-muted/50 p-2 rounded h-12">
                {editingShift === shift.id ? (
                  <div className="flex items-center gap-2 w-full">
                    <Input 
                      placeholder="Cód"
                      type="number"
                      value={editShiftCodeValue}
                      onChange={e => setEditShiftCodeValue(e.target.value)}
                      className="h-8 w-16 px-2"
                      disabled={saving}
                    />
                    <Input 
                      value={editShiftValue}
                      onChange={e => setEditShiftValue(e.target.value)}
                      className="h-8 flex-1"
                      autoFocus
                      disabled={saving}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleEditShift(shift.id);
                        if (e.key === 'Escape') setEditingShift(null);
                      }}
                    />
                    <Button size="sm" variant="ghost" onClick={() => handleEditShift(shift.id)} disabled={saving}>
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingShift(null)} disabled={saving}>
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 truncate">
                      {shift.ref_code !== null && (
                        <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">
                          {shift.ref_code}
                        </span>
                      )}
                      <span className="truncate pr-2">{shift.name}</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { 
                          setEditingShift(shift.id); 
                          setEditShiftValue(shift.name); 
                          setEditShiftCodeValue(shift.ref_code ? shift.ref_code.toString() : '');
                        }} 
                        disabled={saving}
                      >
                        <Edit2 className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveShift(shift.id)} disabled={saving}>
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