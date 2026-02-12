import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, Save, XCircle, Trash2, Tag, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Part, searchParts as searchPartsService, getAfsFromService, Af } from '@/services/partListService';
import { ServiceOrderData, ServiceOrderPart } from '@/types/supabase';
import PartSearchInput from './PartSearchInput';
import AfSearchInput from './AfSearchInput';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ServiceOrderFormProps {
  initialData?: ServiceOrderData | null;
  onSave: (data: ServiceOrderData) => void;
  onCancel: () => void;
}

const ServiceOrderForm: React.FC<ServiceOrderFormProps> = ({ initialData, onSave, onCancel }) => {
  // Dados Básicos
  const [af, setAf] = useState('');
  const [osNumber, setOsNumber] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFinal, setHoraFinal] = useState('');
  const [servico, setServico] = useState('');
  
  // Lista de Peças Adicionadas
  const [parts, setParts] = useState<ServiceOrderPart[]>([]);

  // Busca de Peças
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Lista de AFs para o Autocomplete
  const [allAvailableAfs, setAllAvailableAfs] = useState<Af[]>([]);

  useEffect(() => {
    const loadAfs = async () => {
      const data = await getAfsFromService();
      setAllAvailableAfs(data);
    };
    loadAfs();

    if (initialData) {
      setAf(initialData.af);
      setOsNumber(initialData.os);
      setHoraInicio(initialData.hora_inicio);
      setHoraFinal(initialData.hora_final);
      setServico(initialData.servico_executado);
      setParts(initialData.parts);
    }
  }, [initialData]);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (searchQuery.length > 1) {
        setIsLoadingParts(true);
        const results = await searchPartsService(searchQuery);
        setSearchResults(results);
        setIsLoadingParts(false);
      } else {
        setSearchResults([]);
      }
    };
    const handler = setTimeout(fetchSearchResults, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleAddPart = () => {
    if (!selectedPart) return;
    
    setParts(prev => [...prev, {
      codigo_peca: selectedPart.codigo,
      descricao: selectedPart.descricao,
      quantidade: quantity
    }]);

    setSelectedPart(null);
    setQuantity(1);
    setSearchQuery('');
  };

  const handleRemovePart = (index: number) => {
    setParts(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initialData?.id || uuidv4(),
      af,
      os: osNumber,
      hora_inicio: horaInicio,
      hora_final: horaFinal,
      servico_executado: servico,
      parts
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>AF (Frota)</Label>
          <AfSearchInput
            value={af}
            onChange={setAf}
            onSelectAf={setAf}
            availableAfs={allAvailableAfs}
          />
        </div>
        <div className="space-y-2">
          <Label>OS Número</Label>
          <Input 
            value={osNumber} 
            onChange={e => setOsNumber(e.target.value)} 
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
          value={servico} 
          onChange={e => setServico(e.target.value)} 
          placeholder="Descreva o trabalho realizado..."
          rows={3}
        />
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Tag className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">Peças Utilizadas</h3>
        </div>

        <div className="bg-muted/30 p-4 rounded-lg space-y-4">
          <div className="space-y-2">
            <Label>Buscar Peça no Catálogo</Label>
            <PartSearchInput
              onSearch={setSearchQuery}
              searchResults={searchResults}
              onSelectPart={setSelectedPart}
              searchQuery={searchQuery}
              isLoading={isLoadingParts}
            />
          </div>

          {selectedPart && (
            <div className="flex items-end gap-3 p-3 bg-white dark:bg-zinc-900 border rounded-md">
              <div className="flex-1 space-y-1">
                <p className="text-sm font-bold">{selectedPart.codigo}</p>
                <p className="text-xs text-muted-foreground truncate">{selectedPart.descricao}</p>
              </div>
              <div className="w-20">
                <Label className="text-[10px]">Qtd</Label>
                <Input 
                  type="number" 
                  value={quantity} 
                  onChange={e => setQuantity(parseInt(e.target.value) || 1)} 
                  min="1"
                />
              </div>
              <Button type="button" size="icon" onClick={handleAddPart}>
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {parts.length > 0 && (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs">Código/Descrição</TableHead>
                  <TableHead className="w-16 text-center text-xs">Qtd</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="py-2">
                      <p className="font-bold text-xs">{p.codigo_peca}</p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[250px]">{p.descricao}</p>
                    </TableCell>
                    <TableCell className="text-center font-medium">{p.quantidade}</TableCell>
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
          Cancelar
        </Button>
        <Button type="submit" className="flex-1 gap-2">
          <Save className="h-4 w-4" /> Salvar Ordem
        </Button>
      </div>
    </form>
  );
};

export default ServiceOrderForm;