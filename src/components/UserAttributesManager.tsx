"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/context/CompanyContext';
import { showSuccess, showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, Loader2, Edit2, Check, X, Tag, FileText } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getFrequentPartsForProfession, Part } from '@/services/partListService';

type AttributeItem = { id: string; name: string; ref_code: number; entry_time?: string | null; exit_time?: string | null };

export default function UserAttributesManager() {
  const { company } = useCompany();
  const [professions, setProfessions] = useState<AttributeItem[]>([]);
  const [shifts, setShifts] = useState<AttributeItem[]>([]);
  
  const [newProfession, setNewProfession] = useState('');
  const [newProfessionCode, setNewProfessionCode] = useState('');
  
  const [newShift, setNewShift] = useState('');
  const [newShiftCode, setNewShiftCode] = useState('');
  const [newShiftEntry, setNewShiftEntry] = useState('');
  const [newShiftExit, setNewShiftExit] = useState('');
  
  const [editingProfession, setEditingProfession] = useState<string | null>(null);
  const [editProfessionValue, setEditProfessionValue] = useState('');
  const [editProfessionCodeValue, setEditProfessionCodeValue] = useState('');

  const [editingShift, setEditingShift] = useState<string | null>(null);
  const [editShiftValue, setEditShiftValue] = useState('');
  const [editShiftCodeValue, setEditShiftCodeValue] = useState('');
  const [editShiftEntryValue, setEditShiftEntryValue] = useState('');
  const [editShiftExitValue, setEditShiftExitValue] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // States for Frequent Parts per Profession
  const [selectedProfCode, setSelectedProfCode] = useState<string>('');
  const [frequentParts, setFrequentParts] = useState<Part[]>([]);
  const [loadingFreq, setLoadingFreq] = useState(false);
  const [savingFreq, setSavingFreq] = useState(false);
  const [bulkInput, setBulkInput] = useState('');

  useEffect(() => {
    fetchAttributes();
  }, [company]);

  const fetchAttributes = async () => {
    setLoading(true);
    try {
      const [profRes, shiftRes] = await Promise.all([
        supabase.from('professions').select('id, name, ref_code').eq('company', company).order('name'),
        supabase.from('shifts').select('id, name, ref_code, entry_time, exit_time').eq('company', company).order('name')
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

  const loadFrequentParts = async (profCode: string) => {
    if (!profCode) {
      setFrequentParts([]);
      return;
    }
    setLoadingFreq(true);
    try {
      const parts = await getFrequentPartsForProfession(parseInt(profCode), company);
      setFrequentParts(parts);
    } catch (err) {
      console.error('Error loading frequent parts:', err);
    } finally {
      setLoadingFreq(false);
    }
  };

  useEffect(() => {
    if (selectedProfCode) {
      loadFrequentParts(selectedProfCode);
    } else {
      setFrequentParts([]);
    }
  }, [selectedProfCode, company]);

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
      const { data, error } = await supabase
        .from('shifts')
        .insert({
          name: trimmed,
          ref_code: code,
          company,
          entry_time: newShiftEntry || null,
          exit_time: newShiftExit || null
        })
        .select('id, name, ref_code, entry_time, exit_time')
        .single();
      if (error) throw error;
      setShifts(prev => [...prev, data as AttributeItem].sort((a, b) => a.name.localeCompare(b.name)));
      setNewShift('');
      setNewShiftCode('');
      setNewShiftEntry('');
      setNewShiftExit('');
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
        .update({
          name: trimmed,
          ref_code: code,
          entry_time: editShiftEntryValue || null,
          exit_time: editShiftExitValue || null
        })
        .eq('id', id);
        
      if (updateError) throw updateError;

      setShifts(prev => prev.map(s => s.id === id ? {
        ...s,
        name: trimmed,
        ref_code: code,
        entry_time: editShiftEntryValue || null,
        exit_time: editShiftExitValue || null
      } : s).sort((a, b) => a.name.localeCompare(b.name)));
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

  // Bulk Insert for Frequent Parts
  const parseBulkCodes = (text: string): string[] => {
    return text
      .split(/[\n,;\s\t]+/)
      .map(code => code.trim())
      .filter(code => code.length > 0);
  };

  const handleAddFrequentParts = async () => {
    if (!selectedProfCode) {
      showError("Selecione uma profissão primeiro.");
      return;
    }
    const parsedCodes = parseBulkCodes(bulkInput);
    if (parsedCodes.length === 0) {
      showError("Insira ao menos um código de peça.");
      return;
    }
    
    setSavingFreq(true);
    try {
      const tableName = company === 'citrosuco' ? 'parts_citrosuco' : 'parts';
      
      // 1. Verify if these parts exist in our database
      const { data: validParts, error: partsError } = await supabase
        .from(tableName)
        .select('codigo, descricao')
        .in('codigo', parsedCodes);
        
      if (partsError) throw partsError;
      
      if (!validParts || validParts.length === 0) {
        showError("Nenhum dos códigos inseridos foi encontrado no cadastro de peças.");
        setSavingFreq(false);
        return;
      }
      
      const validCodes = validParts.map(p => p.codigo);
      const invalidCodes = parsedCodes.filter(c => !validCodes.some(vc => vc.toLowerCase() === c.toLowerCase()));
      
      // 2. Fetch existing frequent parts for this profession to avoid duplicates
      const { data: existingFreq, error: freqError } = await supabase
        .from('profession_frequent_parts')
        .select('part_code')
        .eq('profession_code', parseInt(selectedProfCode))
        .eq('company', company);
        
      if (freqError) throw freqError;
      
      const existingCodes = existingFreq ? existingFreq.map(f => f.part_code.toLowerCase()) : [];
      
      // 3. Filter out duplicates (case-insensitive)
      const codesToInsert = validParts.filter(p => !existingCodes.includes(p.codigo.toLowerCase()));
      
      if (codesToInsert.length === 0) {
        if (invalidCodes.length > 0) {
          showError(`Nenhuma peça nova inserida. Peças inválidas: ${invalidCodes.join(', ')}`);
        } else {
          showError("Todas as peças inseridas já estão cadastradas nesta profissão.");
        }
        setSavingFreq(false);
        return;
      }
      
      // 4. Perform bulk insert
      const insertPayload = codesToInsert.map(p => ({
        profession_code: parseInt(selectedProfCode),
        company,
        part_code: p.codigo
      }));
      
      const { error: insertError } = await supabase
        .from('profession_frequent_parts')
        .insert(insertPayload);
        
      if (insertError) throw insertError;
      
      showSuccess(`${insertPayload.length} peças adicionadas com sucesso!`);
      if (invalidCodes.length > 0) {
        showError(`Os seguintes códigos não foram encontrados no banco: ${invalidCodes.join(', ')}`);
      }
      
      setBulkInput('');
      await loadFrequentParts(selectedProfCode);
    } catch (err: any) {
      console.error(err);
      showError(`Erro ao salvar peças: ${err.message}`);
    } finally {
      setSavingFreq(false);
    }
  };

  const handleRemoveFrequentPart = async (partCode: string) => {
    if (!selectedProfCode) return;
    try {
      const { error } = await supabase
        .from('profession_frequent_parts')
        .delete()
        .eq('profession_code', parseInt(selectedProfCode))
        .eq('company', company)
        .eq('part_code', partCode);
        
      if (error) throw error;
      showSuccess("Peça removida com sucesso!");
      await loadFrequentParts(selectedProfCode);
    } catch (err: any) {
      console.error(err);
      showError(`Erro ao remover peça: ${err.message}`);
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Professions Card */}
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
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" disabled={saving}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir profissão?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir a profissão "{prof.name}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRemoveProfession(prof.id)} className="bg-red-500 hover:bg-red-600">
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </>
                  )}
                </li>
              ))}
              {professions.length === 0 && <li className="text-muted-foreground text-sm py-2">Nenhuma profissão cadastrada.</li>}
            </ul>
          </CardContent>
        </Card>

        {/* Shifts Card */}
        <Card>
          <CardHeader>
            <CardTitle>Turnos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex gap-2">
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
                  disabled={saving}
                />
              </div>
              <div className="flex gap-2">
                <Input
                  type="time"
                  placeholder="Entrada"
                  value={newShiftEntry}
                  onChange={e => setNewShiftEntry(e.target.value)}
                  disabled={saving}
                  className="flex-1 h-9"
                  title="Horário de Entrada"
                />
                <Input
                  type="time"
                  placeholder="Saída"
                  value={newShiftExit}
                  onChange={e => setNewShiftExit(e.target.value)}
                  disabled={saving}
                  className="flex-1 h-9"
                  title="Horário de Saída"
                />
                <Button onClick={handleAddShift} disabled={saving || !newShift.trim() || !newShiftCode}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <ul className="space-y-2">
              {shifts.map(shift => (
                <li
                  key={shift.id}
                  className={cn(
                    "flex justify-between items-center bg-muted/50 p-2 rounded transition-all",
                    editingShift === shift.id ? "min-h-[8rem] py-3" : "h-12"
                  )}
                >
                  {editingShift === shift.id ? (
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex gap-2">
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
                        />
                      </div>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="time"
                          value={editShiftEntryValue}
                          onChange={e => setEditShiftEntryValue(e.target.value)}
                          className="h-8 flex-1"
                          disabled={saving}
                        />
                        <Input
                          type="time"
                          value={editShiftExitValue}
                          onChange={e => setEditShiftExitValue(e.target.value)}
                          className="h-8 flex-1"
                          disabled={saving}
                        />
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => handleEditShift(shift.id)} disabled={saving} className="h-8 w-8 p-0">
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingShift(null)} disabled={saving} className="h-8 w-8 p-0">
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 truncate">
                        {shift.ref_code !== null && (
                          <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">
                            {shift.ref_code}
                          </span>
                        )}
                        <span className="truncate pr-2 font-medium">{shift.name}</span>
                        {(shift.entry_time || shift.exit_time) && (
                          <span className="text-[11px] text-muted-foreground bg-background/50 px-2 py-0.5 rounded">
                            {shift.entry_time || '--:--'} - {shift.exit_time || '--:--'}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingShift(shift.id);
                            setEditShiftValue(shift.name);
                            setEditShiftCodeValue(shift.ref_code ? shift.ref_code.toString() : '');
                            setEditShiftEntryValue(shift.entry_time || '');
                            setEditShiftExitValue(shift.exit_time || '');
                          }}
                          disabled={saving}
                        >
                          <Edit2 className="h-4 w-4 text-blue-600" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" disabled={saving}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir turno?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o turno "{shift.name}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRemoveShift(shift.id)} className="bg-red-500 hover:bg-red-600">
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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

      {/* Frequent Parts by Profession Card */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Peças Mais Utilizadas por Profissão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold block">1. Selecione a Profissão</label>
            <Select value={selectedProfCode} onValueChange={setSelectedProfCode}>
              <SelectTrigger className="w-full md:w-80">
                <SelectValue placeholder="Escolha uma profissão..." />
              </SelectTrigger>
              <SelectContent>
                {professions.map(p => (
                  <SelectItem key={p.id} value={p.ref_code.toString()}>
                    {p.name} ({p.ref_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProfCode && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
              {/* Left Side: Bulk Input */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Adicionar Peças em Lote
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Cole os códigos das peças separados por vírgula, ponto e vírgula, espaços ou linhas. O sistema validará se a peça existe no banco.
                  </p>
                </div>
                <Textarea
                  placeholder="Ex: 102030, 405060; 708090"
                  value={bulkInput}
                  onChange={e => setBulkInput(e.target.value)}
                  rows={4}
                  disabled={savingFreq}
                />
                <Button 
                  onClick={handleAddFrequentParts} 
                  disabled={savingFreq || !bulkInput.trim()}
                  className="w-full"
                >
                  {savingFreq ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Validando e salvando...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Peças em Lote
                    </>
                  )}
                </Button>
              </div>

              {/* Right Side: List of Frequent Parts */}
              <div className="space-y-3">
                <label className="text-sm font-bold block">
                  Peças Cadastradas para esta Profissão ({frequentParts.length})
                </label>
                
                {loadingFreq ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : frequentParts.length > 0 ? (
                  <div className="border rounded-md max-h-64 overflow-y-auto p-2 bg-muted/20">
                    <div className="flex flex-wrap gap-2">
                      {frequentParts.map((part) => (
                        <div
                          key={part.id}
                          className="bg-white dark:bg-gray-800 border rounded px-2.5 py-1.5 flex items-center gap-2 text-xs hover:border-red-200 transition-colors group"
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-primary">{part.codigo}</span>
                            <span className="text-muted-foreground truncate max-w-[150px]" title={part.descricao}>
                              {part.name || part.descricao}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveFrequentPart(part.codigo)}
                            className="text-muted-foreground hover:text-red-500 rounded p-0.5 transition-colors"
                            title="Remover peça"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed rounded-md p-8 text-center text-sm text-muted-foreground bg-muted/10">
                    Nenhuma peça mais utilizada cadastrada para esta profissão ainda.
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}