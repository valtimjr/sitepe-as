/** @jsxImportSource react */
"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Save, XCircle, FileText, Loader2 } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Af, getAfsFromService, addAf, updateAf, deleteAf, importAfs, exportDataAsCsv, exportDataAsJson, getAllAfsForExport } from '@/services/partListService';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/responsive/ResponsiveDialog';
import ResponsiveSheetContent from '@/components/responsive/ResponsiveSheetContent';
import AdminToolbar from '@/components/admin/AdminToolbar';
import AdminItemCard from '@/components/admin/AdminItemCard';
import { useIsCompact } from '@/hooks/use-compact';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { useCompany } from '@/context/CompanyContext';
import { supabase } from '@/integrations/supabase/client';

// Quantos AFs desenhar por vez ("Mostrar mais" carrega o próximo bloco)
const RENDER_STEP = 50;

const AfManagementTable: React.FC = () => {
  const { company, branding } = useCompany();
  const [afs, setAfs] = useState<Af[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [currentAf, setCurrentAf] = useState<Af | null>(null);
  const [formAfNumber, setFormAfNumber] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(RENDER_STEP);
  const isCompact = useIsCompact();
  const [selectedAfIds, setSelectedAfIds] = useState<Set<string>>(() => new Set());
  
  // Estados para importação
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [parsedAfsToImport, setParsedAfsToImport] = useState<Af[]>([]);
  const [importLog, setImportLog] = useState<string[]>([]);
  const [updateExistingAfs, setUpdateExistingAfs] = useState(true);
  const [importStats, setImportStats] = useState({ newCount: 0, existingCount: 0 });
  const [cachedExistingAfs, setCachedExistingAfs] = useState<Set<string>>(new Set());

  // Novos estados para o mapeamento CSV
  const [isMappingDialogOpen, setIsMappingDialogOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawCsvData, setRawCsvData] = useState<any[]>([]);
  const [currentImportFile, setCurrentImportFile] = useState<string>('');
  const [columnMapping, setColumnMapping] = useState({
    af_number: '',
    descricao: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAfs = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedAfs = await getAfsFromService(company);
      setAfs(fetchedAfs);
    } catch (error) {
      showError('Erro ao carregar AFs.');
    } finally {
      setIsLoading(false);
    }
  }, [company]);

  useEffect(() => {
    loadAfs();
  }, [loadAfs]);

  // Busca com debounce para não refiltrar a cada tecla
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchInput);
      setVisibleCount(RENDER_STEP);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const filteredAfs = useMemo(() => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    return afs.filter(af =>
      af.af_number.toLowerCase().includes(lowerCaseQuery) ||
      (af.descricao && af.descricao.toLowerCase().includes(lowerCaseQuery)),
    );
  }, [afs, searchQuery]);
  const visibleAfs = filteredAfs.slice(0, visibleCount);

  const handleAddAf = () => {
    setCurrentAf(null);
    setFormAfNumber('');
    setFormDescricao('');
    setIsSheetOpen(true);
  };

  const handleEditAf = (af: Af) => {
    setCurrentAf(af);
    setFormAfNumber(af.af_number);
    setFormDescricao(af.descricao || '');
    setIsSheetOpen(true);
  };

  const handleDeleteAf = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este AF?')) return;
    try {
      await deleteAf(id, company);
      showSuccess('AF excluído com sucesso!');
      loadAfs();
    } catch (error) {
      showError('Erro ao excluir AF.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAfNumber.trim()) {
      showError('O número do AF é obrigatório.');
      return;
    }

    try {
      const payload: Omit<Af, 'id'> = {
        af_number: formAfNumber.trim(),
        descricao: formDescricao.trim(),
      };

      if (currentAf) {
        await updateAf({
          ...currentAf,
          ...payload,
        }, company);
        showSuccess('AF atualizado com sucesso!');
      } else {
        await addAf(payload, company);
        showSuccess('AF adicionado com sucesso!');
      }
      setIsSheetOpen(false);
      loadAfs();
    } catch (error) {
      showError('Erro ao salvar AF.');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allVisibleAfIds = new Set(filteredAfs.map(af => af.id));
      setSelectedAfIds(allVisibleAfIds);
    } else {
      setSelectedAfIds(new Set());
    }
  };

  const handleSelectAf = (id: string, checked: boolean) => {
    setSelectedAfIds(prev => {
      const newSelection = new Set(prev);
      if (checked) {
        newSelection.add(id);
      } else {
        newSelection.delete(id);
      }
      return newSelection;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedAfIds.size === 0) {
      showError('Nenhum AF selecionado para exclusão.');
      return;
    }
    try {
      await Promise.all(Array.from(selectedAfIds).map(id => deleteAf(id, company)));
      showSuccess(`${selectedAfIds.size} AFs excluídos com sucesso!`);
      setSelectedAfIds(new Set());
      loadAfs();
    } catch (error) {
      showError('Erro ao excluir AFs selecionados.');
    }
  };

  const handleImportCsv = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) return;

    setCurrentImportFile(file.name);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      
      if (!csvText.trim()) {
        showError("O arquivo CSV está vazio.");
        return;
      }

      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const headers = results.meta.fields || [];
          if (headers.length === 0) {
            showError("Não foi possível identificar os cabeçalhos do CSV.");
            return;
          }
          
          setCsvHeaders(headers);
          setRawCsvData(results.data);
          
          // Tenta mapear automaticamente baseado em nomes comuns
          const autoMap = {
            af_number: headers.find(h => ['af_number', 'af', 'codigo', 'código', 'id', 'numero'].includes(h.toLowerCase().trim())) || '',
            descricao: headers.find(h => ['descricao', 'descrição', 'description', 'desc'].includes(h.toLowerCase().trim())) || '',
          };
          
          setColumnMapping(autoMap);
          setIsMappingDialogOpen(true);
        },
        error: (error: any) => {
          showError(`Erro ao ler CSV: ${error.message}`);
        }
      });
    };

    reader.onerror = () => {
      showError("Erro ao ler o arquivo.");
    };

    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleApplyMapping = async () => {
    if (!columnMapping.af_number) {
      showError("É obrigatório mapear a coluna de 'Número do AF'.");
      return;
    }

    const loadingToastId = showLoading('Verificando AFs existentes no banco...');

    try {
      // Busca todos os AFs paginando de 1000 em 1000
      const existingAfs = new Set<string>();
      let from = 0;
      const step = 1000;
      let fetchMore = true;
      const tableName = company === 'citrosuco' ? 'afs_citrosuco' : 'afs';

      while (fetchMore) {
        const { data, error } = await supabase
          .from(tableName)
          .select('af_number')
          .range(from, from + step - 1);

        if (error) {
          console.error("Erro ao buscar AFs:", error);
          throw error;
        }

        if (data && data.length > 0) {
          data.forEach(item => {
            if (item.af_number) existingAfs.add(item.af_number.toLowerCase().trim());
          });
          from += step;
          if (data.length < step) {
            fetchMore = false;
          }
        } else {
          fetchMore = false;
        }
      }

      setCachedExistingAfs(existingAfs);

      // Extrai os AFs baseados no mapeamento
      let newAfs: Af[] = rawCsvData.map((row) => {
        const afNumber = row[columnMapping.af_number]?.trim();
        const descricao = columnMapping.descricao ? row[columnMapping.descricao]?.trim() : '';
        
        if (!afNumber) return null;

        return {
          id: row.id || uuidv4(),
          af_number: afNumber,
          descricao: descricao || '',
        };
      }).filter((af): af is Af => af !== null);

      // Deduplicação no arquivo antes de importar
      const afMap = new Map<string, Af>();
      newAfs.forEach(af => {
        afMap.set(af.af_number.toLowerCase().trim(), af);
      });
      const deduplicatedAfs = Array.from(afMap.values());

      let newCount = 0;
      let existingCount = 0;

      deduplicatedAfs.forEach(af => {
        if (existingAfs.has(af.af_number.toLowerCase().trim())) {
          existingCount++;
        } else {
          newCount++;
        }
      });

      setImportStats({ newCount, existingCount });
      setParsedAfsToImport(deduplicatedAfs);
      setUpdateExistingAfs(true); // reset para padrão

      setImportLog([
        `Arquivo lido: ${currentImportFile}`, 
        `Total de linhas com número de AF válido: ${newAfs.length}`,
        `Total de AFs únicos encontrados no CSV: ${deduplicatedAfs.length}`,
        `AFs totais no banco para cruzamento: ${existingAfs.size}`,
      ]);
      
      setIsMappingDialogOpen(false);
      setTimeout(() => setIsImportConfirmOpen(true), 300);
    } catch (error) {
      showError("Erro ao processar mapeamento das colunas.");
    } finally {
      dismissToast(loadingToastId);
    }
  };

  const confirmImport = async () => {
    // Filtra os AFs baseado na escolha do usuário
    const finalAfsToImport = updateExistingAfs 
      ? parsedAfsToImport 
      : parsedAfsToImport.filter(af => !cachedExistingAfs.has(af.af_number.toLowerCase().trim()));

    if (finalAfsToImport.length === 0) {
      showError('Nenhum AF para importar com as opções selecionadas.');
      setIsImportConfirmOpen(false);
      return;
    }

    const loadingToastId = showLoading(`Processando ${finalAfsToImport.length} AFs...`);
    setImportLog(prev => [...prev, 'Enviando para o banco de dados...']);

    try {
      await importAfs(finalAfsToImport, company);
      setImportLog(prev => [...prev, `Sucesso: ${finalAfsToImport.length} AFs importados/atualizados.`]);
      showSuccess(`${finalAfsToImport.length} AFs processados com sucesso!`);
      loadAfs();
    } catch (error) {
      setImportLog(prev => [...prev, 'ERRO: Falha na importação.']);
      showError('Erro ao importar AFs do CSV.');
    } finally {
      dismissToast(loadingToastId);
      setIsImportConfirmOpen(false);
      setParsedAfsToImport([]);
    }
  };

  const handleExportCsv = async () => {
    let dataToExport: Af[] = [];
    let loadingToastId: string | number | undefined;
    try {
      loadingToastId = showLoading('Preparando exportação de AFs...');
      if (selectedAfIds.size > 0) {
        dataToExport = afs.filter(af => selectedAfIds.has(af.id));
        exportDataAsCsv(dataToExport, 'afs_selecionados.csv');
        showSuccess(`${dataToExport.length} AFs selecionados exportados para CSV com sucesso!`);
      } else {
        dataToExport = await getAllAfsForExport(company);
        exportDataAsCsv(dataToExport, `todos_afs_${company}.csv`);
        showSuccess('Todos os AFs exportados para CSV com sucesso!');
      }
    } catch (error) {
      showError('Erro ao exportar AFs.');
    } finally {
      if (loadingToastId) dismissToast(loadingToastId);
    }
  };

  const handleExportJson = async () => {
    let dataToExport: Af[] = [];
    let loadingToastId: string | number | undefined;
    try {
      loadingToastId = showLoading('Preparando exportação de AFs...');
      if (selectedAfIds.size > 0) {
        dataToExport = afs.filter(af => selectedAfIds.has(af.id));
        exportDataAsJson(dataToExport, 'afs_selecionados.json');
        showSuccess(`${dataToExport.length} AFs selecionados exportados para JSON com sucesso!`);
      } else {
        dataToExport = await getAllAfsForExport(company);
        exportDataAsJson(dataToExport, `todos_afs_${company}.json`);
        showSuccess('Todos os AFs exportados para JSON com sucesso!');
      }
    } catch (error) {
      showError('Erro ao exportar AFs.');
    } finally {
      if (loadingToastId) dismissToast(loadingToastId);
    }
  };

  const isAllSelected = filteredAfs.length > 0 && selectedAfIds.size === filteredAfs.length;
  const isIndeterminate = selectedAfIds.size > 0 && selectedAfIds.size < filteredAfs.length;

  return (
    <Card className="w-full rounded-none border-0 bg-transparent shadow-none lg:rounded-lg lg:border lg:bg-card lg:shadow-sm">
      <CardContent className="p-0 lg:p-6">
        <AdminToolbar
          title={`Gerenciar AFs (${branding.name})`}
          search={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder="Buscar AF por número ou descrição..."
          addLabel="Adicionar AF"
          onAdd={handleAddAf}
          onImport={handleImportCsv}
          onExportCsv={handleExportCsv}
          onExportJson={handleExportJson}
          selectedCount={selectedAfIds.size}
          selectAllState={isAllSelected ? true : isIndeterminate ? 'indeterminate' : false}
          onSelectAll={filteredAfs.length > 0 ? handleSelectAll : undefined}
          onBulkDelete={handleBulkDelete}
          bulkDeleteDescription={`Esta ação irá remover ${selectedAfIds.size} AFs selecionados. Esta ação não pode ser desfeita.`}
        />

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv"
          style={{ position: 'absolute', left: '-9999px' }}
        />

        {isLoading ? (
          <p className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></p>
        ) : filteredAfs.length === 0 && searchQuery.length > 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum AF encontrado para "{searchQuery}".</p>
        ) : filteredAfs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum AF cadastrado para esta empresa.</p>
        ) : isCompact ? (
          <div className="flex flex-col gap-2">
            {visibleAfs.map((af) => (
              <AdminItemCard
                key={af.id}
                title={af.af_number}
                subtitle={af.descricao || 'Sem descrição'}
                selected={selectedAfIds.has(af.id)}
                onSelectedChange={c => handleSelectAf(af.id, c)}
                onOpen={() => handleEditAf(af)}
                actions={[
                  { label: 'Editar', icon: Edit, onSelect: () => handleEditAf(af) },
                  { label: 'Excluir', icon: Trash2, onSelect: () => handleDeleteAf(af.id), destructive: true },
                ]}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={isAllSelected ? true : isIndeterminate ? 'indeterminate' : false}
                      onCheckedChange={(checked) => handleSelectAll(checked === true)}
                      aria-label="Selecionar todos os AFs"
                    />
                  </TableHead>
                  <TableHead className="w-[120px]">Número do AF</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleAfs.map((af) => (
                  <TableRow key={af.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedAfIds.has(af.id)}
                        onCheckedChange={(checked) => handleSelectAf(af.id, checked === true)}
                        aria-label={`Selecionar AF ${af.af_number}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{af.af_number}</TableCell>
                    <TableCell>{af.descricao || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditAf(af)} className="mr-2">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteAf(af.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {visibleCount < filteredAfs.length && (
          <div className="mt-4 flex flex-col items-center gap-1">
            <Button variant="outline" onClick={() => setVisibleCount(c => c + RENDER_STEP)}>
              Mostrar mais
            </Button>
            <span className="text-xs text-muted-foreground">
              {visibleAfs.length} de {filteredAfs.length}
            </span>
          </div>
        )}
      </CardContent>

      {/* Dialog para Mapeamento CSV */}
      <ResponsiveDialog open={isMappingDialogOpen} onOpenChange={setIsMappingDialogOpen}>
        <ResponsiveDialogContent dialogClassName="sm:max-w-[425px]">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Mapear Colunas do CSV</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Selecione as colunas do seu arquivo correspondentes aos campos do sistema.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="map-af-number" className="text-right font-bold text-xs">Nº do AF *</Label>
              <select
                id="map-af-number"
                value={columnMapping.af_number}
                onChange={(e) => setColumnMapping({...columnMapping, af_number: e.target.value})}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Selecione a coluna...</option>
                {csvHeaders.map(h => <option key={`af-${h}`} value={h}>{h}</option>)}
              </select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="map-descricao" className="text-right text-xs">Descrição</Label>
              <select
                id="map-descricao"
                value={columnMapping.descricao}
                onChange={(e) => setColumnMapping({...columnMapping, descricao: e.target.value})}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Nenhuma (Opcional)</option>
                {csvHeaders.map(h => <option key={`desc-${h}`} value={h}>{h}</option>)}
              </select>
            </div>
          </div>
          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setIsMappingDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleApplyMapping}>Confirmar Mapeamento</Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Sheet de Edição/Adição */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <ResponsiveSheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{currentAf ? 'Editar AF' : 'Adicionar Novo AF'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="af_number" className="text-right">
                Número do AF
              </Label>
              <Input
                id="af_number"
                value={formAfNumber}
                onChange={(e) => setFormAfNumber(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="descricao" className="text-right">
                Descrição (Opcional)
              </Label>
              <Textarea
                id="descricao"
                value={formDescricao}
                onChange={(e) => setFormDescricao(e.target.value)}
                placeholder="Ex: Frota de Caminhões Pesados"
                className="col-span-3"
              />
            </div>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)}>
                <XCircle className="h-4 w-4 mr-2" /> Cancelar
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" /> Salvar
              </Button>
            </SheetFooter>
          </form>
        </ResponsiveSheetContent>
      </Sheet>

      {/* AlertDialog de Confirmação de Importação */}
      <AlertDialog open={isImportConfirmOpen} onOpenChange={setIsImportConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Importar AFs
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {parsedAfsToImport.length > 0 ? (
                  <div className="mb-4 space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-sm bg-muted/50 p-3 rounded-md border border-border">
                      <div>
                        <span className="font-bold text-lg text-green-600 block">{importStats.newCount}</span>
                        <span className="text-muted-foreground font-medium">AFs não cadastrados (Novos)</span>
                      </div>
                      <div>
                        <span className="font-bold text-lg text-blue-600 block">{importStats.existingCount}</span>
                        <span className="text-muted-foreground font-medium">AFs já existentes</span>
                      </div>
                    </div>

                    {importStats.existingCount > 0 && (
                      <div className="flex items-start space-x-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded-md border border-blue-200 dark:border-blue-800/50">
                        <Checkbox 
                          id="update-existing" 
                          checked={updateExistingAfs} 
                          onCheckedChange={(c) => setUpdateExistingAfs(c === true)} 
                          className="mt-1"
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor="update-existing"
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            Atualizar informações de AFs já existentes
                          </label>
                          <p className="text-xs opacity-80 mt-1">
                            Se marcado, a descrição dos AFs existentes será substituída pela do CSV. <strong>AFs não serão duplicados.</strong>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mb-4 text-destructive">Nenhum AF válido encontrado.</p>
                )}
                <h4 className="font-semibold text-foreground mb-2">Log de Processamento:</h4>
                <ScrollArea className="h-28 w-full rounded-md border p-3 text-xs font-mono bg-muted/30">
                  {importLog.map((line, index) => (
                    <p key={index} className="text-muted-foreground mb-1">
                      {line}
                    </p>
                  ))}
                </ScrollArea>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setParsedAfsToImport([]);
              setImportLog([]);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport} disabled={parsedAfsToImport.length === 0 || (importStats.newCount === 0 && !updateExistingAfs)}>
              Confirmar Importação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default AfManagementTable;