import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2, Save, XCircle, ArrowLeft, Copy, Download, FileText, MoreHorizontal } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { CustomList, CustomListItem, Part } from '@/types/supabase';
import { getCustomListItems, addCustomListItem, updateCustomListItem, deleteCustomListItem } from '@/services/customListService';
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
import PartSearchInput from './PartSearchInput';
import { getParts, searchParts as searchPartsService } from '@/services/partListService'; // Importação corrigida
import { exportDataAsCsv, exportDataAsJson } from '@/services/partListService';
import { generateCustomListPdf } from '@/lib/pdfGenerator'; // Importar nova função
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface CustomListEditorProps {
  list: CustomList;
  onClose: () => void;
}

const CustomListEditor: React.FC<CustomListEditorProps> = ({ list, onClose }) => {
  const [items, setItems] = useState<CustomListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState<CustomListItem | null>(null);
  
  // Form states
  const [formItemName, setFormItemName] = useState('');
  const [formPartCode, setFormPartCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formQuantity, setFormQuantity] = useState(1);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [allAvailableParts, setAllAvailableParts] = useState<Part[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(true);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedItems = await getCustomListItems(list.id);
      setItems(fetchedItems);
    } catch (error) {
      showError('Erro ao carregar itens da lista.');
      console.error('Failed to load custom list items:', error);
    } finally {
      setIsLoading(false);
    }
  }, [list.id]);

  const loadParts = useCallback(async () => {
    setIsLoadingParts(true);
    try {
      const parts = await getParts();
      setAllAvailableParts(parts);
    } catch (error) {
      console.error('Failed to load all parts:', error);
    } finally {
      setIsLoadingParts(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
    loadParts();
  }, [loadItems, loadParts]);

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
    const handler = setTimeout(() => {
      fetchSearchResults();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const resetForm = () => {
    setCurrentEditItem(null);
    setFormItemName('');
    setFormPartCode('');
    setFormDescription('');
    setFormQuantity(1);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleAdd = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (item: CustomListItem) => {
    setCurrentEditItem(item);
    setFormItemName(item.item_name);
    setFormPartCode(item.part_code || '');
    setFormDescription(item.description || '');
    setFormQuantity(item.quantity);
    setSearchQuery('');
    setSearchResults([]);
    setIsDialogOpen(true);
  };

  const handleSelectPart = (part: Part) => {
    setFormPartCode(part.codigo);
    setFormDescription(part.descricao);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedItemName = formItemName.trim();
    const trimmedDescription = formDescription.trim();
    const trimmedPartCode = formPartCode.trim();

    if (formQuantity <= 0) {
      showError('A quantidade deve ser maior que zero.');
      return;
    }

    // Validação: Pelo menos o nome personalizado OU a descrição deve estar preenchido
    if (!trimmedItemName && !trimmedDescription) {
      showError('O Nome ou a Descrição da Peça deve ser preenchido.');
      return;
    }

    // Determina o nome final do item: usa o nome personalizado, ou a descrição como fallback
    const finalItemName = trimmedItemName || trimmedDescription;

    const payload: Omit<CustomListItem, 'id' | 'created_at'> = {
      list_id: list.id,
      item_name: finalItemName,
      part_code: trimmedPartCode || null,
      description: trimmedDescription || null,
      quantity: formQuantity,
    };

    try {
      if (currentEditItem) {
        await updateCustomListItem({ ...currentEditItem, ...payload });
        showSuccess('Item atualizado com sucesso!');
      } else {
        await addCustomListItem(payload);
        showSuccess('Item adicionado com sucesso!');
      }
      
      setIsDialogOpen(false);
      loadItems();
    } catch (error) {
      showError('Erro ao salvar item.');
      console.error('Failed to save item:', error);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await deleteCustomListItem(itemId);
      showSuccess('Item excluído com sucesso!');
      loadItems();
    } catch (error) {
      showError('Erro ao excluir item.');
      console.error('Failed to delete item:', error);
    }
  };

  const formatListText = () => {
    if (items.length === 0) return '';

    let formattedText = `${list.title}\n\n`;

    items.forEach(item => {
      const quantidade = item.quantity;
      const nome = item.item_name || '';
      const codigo = item.part_code ? ` (Cód: ${item.part_code})` : '';
      const descricao = item.description || '';
      
      // Formato: [QUANTIDADE] - [NOME PERSONALIZADO] [DESCRIÇÃO] (Cód: [CÓDIGO])
      formattedText += `${quantidade} - ${nome} ${descricao}${codigo}`.trim() + '\n';
    });

    return formattedText.trim();
  };

  const handleCopyList = async () => {
    if (items.length === 0) {
      showError('A lista está vazia. Adicione itens antes de copiar.');
      return;
    }

    const textToCopy = formatListText();

    try {
      await navigator.clipboard.writeText(textToCopy);
      showSuccess('Lista de peças copiada para a área de transferência!');
    } catch (err) {
      showError('Erro ao copiar a lista. Por favor, tente novamente.');
      console.error('Failed to copy list items:', err);
    }
  };

  const handleExportCsv = () => {
    if (items.length === 0) {
      showError('A lista está vazia. Adicione itens antes de exportar.');
      return;
    }
    exportDataAsCsv(items, `${list.title.replace(/\s/g, '_')}_itens.csv`);
    showSuccess('Lista exportada para CSV com sucesso!');
  };

  const handleExportPdf = () => {
    if (items.length === 0) {
      showError('A lista está vazia. Adicione itens antes de exportar.');
      return;
    }
    generateCustomListPdf(items, list.title);
    showSuccess('PDF gerado com sucesso!');
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col space-y-2 pb-2">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={onClose} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <CardTitle className="text-2xl font-bold truncate max-w-[70%]">{list.title}</CardTitle>
          <Button onClick={handleAdd} className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" /> Adicionar Item
          </Button>
        </div>
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={items.length === 0} className="flex items-center gap-2">
                <MoreHorizontal className="h-4 w-4" /> Ações
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopyList} disabled={items.length === 0}>
                <Copy className="h-4 w-4 mr-2" /> Copiar Lista
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportCsv} disabled={items.length === 0}>
                <Download className="h-4 w-4 mr-2" /> Exportar CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPdf} disabled={items.length === 0}>
                <FileText className="h-4 w-4 mr-2" /> Exportar PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Carregando itens da lista...</p>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum item nesta lista.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Qtd</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cód. Peça</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.quantity}</TableCell>
                    <TableCell>{item.item_name}</TableCell>
                    <TableCell>{item.part_code || 'N/A'}</TableCell>
                    <TableCell>{item.description || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="mr-2">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação irá remover o item "{item.item_name}" da lista. Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(item.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{currentEditItem ? 'Editar Item' : 'Adicionar Novo Item'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">Nome (Opcional)</Label>
              <Input
                id="item-name"
                value={formItemName}
                onChange={(e) => setFormItemName(e.target.value)}
                placeholder="Ex: Kit de Reparo do Motor"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="search-part">Buscar Peça (Opcional)</Label>
              <PartSearchInput
                onSearch={setSearchQuery}
                searchResults={searchResults}
                onSelectPart={handleSelectPart}
                searchQuery={searchQuery}
                allParts={allAvailableParts}
                isLoading={isLoadingParts}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="part-code">Código da Peça (Opcional)</Label>
              <Input
                id="part-code"
                value={formPartCode}
                onChange={(e) => setFormPartCode(e.target.value)}
                placeholder="Código da peça"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (Opcional)</Label>
              <Input
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Descrição da peça"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade</Label>
              <Input
                id="quantity"
                type="number"
                value={formQuantity}
                onChange={(e) => setFormQuantity(parseInt(e.target.value) || 1)}
                min="1"
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                <XCircle className="h-4 w-4 mr-2" /> Cancelar
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" /> Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CustomListEditor;