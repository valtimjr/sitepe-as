"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Part, searchParts as searchPartsService, getAfsFromService, Af } from '@/services/partListService';
import PartSearchInput from './PartSearchInput';
import AfSearchInput from './AfSearchInput';
import { showSuccess, showError } from '@/utils/toast';
import { Save, XCircle, PlusCircle, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { ServiceOrderData } from '@/types/supabase';
import { v4 as uuidv4 } from 'uuid';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ServiceOrderFormProps {
  initialData: ServiceOrderData | null;
  onSave: (data: ServiceOrderData) => void;
  onCancel: () => void;
}

const ServiceOrderForm: React.FC<ServiceOrderFormProps> = ({ initialData, onSave, onCancel }) => {
  const [af, setAf] = useState('');
  const [os, setOs] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFinal, setHoraFinal] = useState('');
  const [servicoExecutado, setServicoExecutado] = useState('');
  const [parts, setParts] = useState<{codigo_peca: string, descricao: string, quantidade: number}[]>([]);
  
  // Estados para busca de peças
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [partQuantity, setPartQuantity] = useState(1);
  const [availableAfs, setAvailableAfs] = useState<Af[]>([]);

  useEffect(() => {
    const loadAfs = async () => {
      const data = await getAfsFromService();
      setAvailableAfs(data);
    };
    loadAfs();
    
    if (initialData) {
      setAf(initialData.af);
      setOs(initialData.os || '');
      setHoraInicio(initialData.hora_inicio || '');
      setHoraFinal(initialData.hora_final || '');
      setServicoExecutado(initialData.servico_executado || '');
      setParts(initialData.parts || []);
    }
  }, [initialData]);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (searchQuery.length > 1) {
        setIsLoadingParts(true);
        const results = await searchPartsService(searchQuery);
        setSearchResults(results);
        setIsLoadingParts(false);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleAddPart = () => {
    if (!selectedPart) return;
    setParts(prev => [...prev, {
      codigo_peca: selectedPart.codigo,
      descricao: selectedPart.descricao,
      quantidade: partQuantity
    }]);
    setSelectedPart(null);
    setSearchQuery('');
    setPartQuantity(1);
    showSuccess('Peça adicionada à lista.');
  };

  const handleRemovePart = (index: number) => {
    setParts(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!af) {
      showError('O número do AF é obrigatório.');
      return;
    }

    const data: ServiceOrderData = {
      id: initialData?.id || uuidv4(),
      af,
      os,
      hora_inicio: horaInicio,
      hora_final: horaFinal,
      servico_executado: servicoExecutado,
      parts
    };

    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>AF (Número de Frota)</Label>
          <AfSearchInput
            value={af}
            onChange={setAf}
            onSelectAf={setAf}
            availableAfs={availableAfs}
          />
        </div>
        <div className="space-y-2">
          <Label>Número da OS</Label>
          <Input 
            value={os} 
            onChange={e => setOs(e.target.value)} 
            placeholder="Ex: 45001"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Hora Início</Label>
          <Input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Hora Final</Label>
          <Input type="time" value={horaFinal} onChange={e => setHoraFinal(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Serviço Executado</Label>
        <Textarea 
          value={servicoExecutado} 
          onChange={e => setServicoExecutado(e.target.value)} 
          placeholder="Descreva o trabalho realizado..."
          rows={3}
        />
      </div>

      <div className="border-t pt-4 space-y-4">
        <h3 className="font-bold text-lg">Peças Utilizadas</h3>
        
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full space-y-2">
            <Label>Buscar Peça</Label>
            <PartSearchInput
              onSearch={setSearchQuery}
              searchResults={searchResults}
              onSelectPart={setSelectedPart}
              searchQuery={searchQuery}
              isLoading={isLoadingParts}
            />
          </div>
          <div className="w-24 space-y-2">
            <Label>Qtd</Label>
            <Input 
              type="number" 
              value={partQuantity} 
              onChange={e => setPartQuantity(Number(e.target.value))} 
              min={1} 
            />
          </div>
          <Button 
            type="button" 
            variant="secondary" 
            onClick={handleAddPart}
            disabled={!selectedPart}
          >
            <PlusCircle className="h-4 w-4 mr-2" /> Add
          </Button>
        </div>

        {selectedPart && (
          <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
            Selecionado: <strong>{selectedPart.codigo}</strong> - {selectedPart.descricao}
          </div>
        )}

        {parts.length > 0 && (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Peça</TableHead>
                  <TableHead className="w-16 text-center">Qtd</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">
                      <div className="font-medium">{p.codigo_peca}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">{p.descricao}</div>
                    </TableCell>
                    <TableCell className="text-center">{p.quantidade}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemovePart(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          <XCircle className="h-4 w-4 mr-2" /> Cancelar
        </Button>
        <Button type="submit" className="flex-1">
          <Save className="h-4 w-4 mr-2" /> Salvar OS
        </Button>
      </div>
    </form>
  );
};

export default ServiceOrderForm;