import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SimplePartItem, clearSimplePartsList, deleteSimplePartItem } from '@/services/partListService';
import { generatePartsListPdf } from '@/lib/pdfGenerator';
import { showSuccess, showError } from '@/utils/toast';
import { Trash2, Download, Copy, GripVertical } from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


interface PartsListDisplayProps {
  listItems: SimplePartItem[];
  onListChanged: () => void;
  onListReordered: (reorderedItems: SimplePartItem[]) => void; // Nova prop
  listTitle: string;
  onTitleChange: (title: string) => void;
}

const PartsListDisplay: React.FC<PartsListDisplayProps> = ({ listItems, onListChanged, onListReordered, listTitle, onTitleChange }) => {
  const [orderedItems, setOrderedItems] = useState<SimplePartItem[]>(listItems);
  const [draggedItem, setDraggedItem] = useState<SimplePartItem | null>(null);

  // Sincroniza o estado interno com a prop listItems quando ela muda
  useEffect(() => {
    setOrderedItems(listItems);
  }, [listItems]);

  const handleExportPdf = () => {
    if (orderedItems.length === 0) {
      showError('A lista está vazia. Adicione itens antes de exportar.');
      return;
    }
    // Passa o título personalizado e a lista na ordem atual
    generatePartsListPdf(orderedItems, listTitle);
    showSuccess('PDF gerado com sucesso!');
  };

  // Função para formatar o texto da lista na ordem atual
  const formatListText = () => {
    if (orderedItems.length === 0) return '';

    let formattedText = `${listTitle}\n\n`;

    orderedItems.forEach(item => {
      const quantidade = item.quantidade ?? 1;
      const codigo = item.codigo_peca || '';
      const descricao = item.descricao || '';
      const af = item.af ? ` (AF: ${item.af})` : '';
      
      // Formato: [QUANTIDADE] - [CÓDIGO] [DESCRIÇÃO] (AF: [AF])
      formattedText += `${quantidade} - ${codigo} ${descricao}${af}`.trim() + '\n';
    });

    return formattedText.trim();
  };

  const handleCopyList = async () => {
    if (orderedItems.length === 0) {
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

  const handleShareOnWhatsApp = () => {
    if (orderedItems.length === 0) {
      showError('A lista está vazia. Adicione itens antes de compartilhar.');
      return;
    }

    const textToShare = formatListText();
    const encodedText = encodeURIComponent(textToShare);
    const whatsappUrl = `https://wa.me/?text=${encodedText}`;

    window.open(whatsappUrl, '_blank');
    showSuccess('Lista de peças pronta para compartilhar no WhatsApp!');
  };

  const handleClearList = async () => {
    try {
      await clearSimplePartsList();
      onListChanged();
      showSuccess('Lista de peças simples limpa com sucesso!');
    } catch (error) {
      showError('Erro ao limpar a lista de peças simples.');
      console.error('Failed to clear simple parts list:', error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteSimplePartItem(id);
      onListChanged();
      showSuccess('Item removido da lista.');
    } catch (error) {
      showError('Erro ao remover item da lista.');
      console.error('Failed to delete item:', error);
    }
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, item: SimplePartItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id); // Necessário para Firefox
    e.currentTarget.classList.add('opacity-50'); // Feedback visual
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault(); // Permite o drop
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('border-t-2', 'border-primary'); // Feedback visual para o alvo
  };

  const handleDragLeave = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.currentTarget.classList.remove('border-t-2', 'border-primary'); // Remove feedback
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, targetItem: SimplePartItem) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-t-2', 'border-primary'); // Remove feedback

    if (draggedItem && draggedItem.id !== targetItem.id) {
      const newOrderedItems = [...orderedItems];
      const draggedIndex = newOrderedItems.findIndex(item => item.id === draggedItem.id);
      const targetIndex = newOrderedItems.findIndex(item => item.id === targetItem.id);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        // Remove o item arrastado
        const [removed] = newOrderedItems.splice(draggedIndex, 1);
        // Insere o item arrastado na nova posição
        newOrderedItems.splice(targetIndex, 0, removed);
        
        setOrderedItems(newOrderedItems);
        onListReordered(newOrderedItems); // Notifica o componente pai
      }
    }
    setDraggedItem(null);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.currentTarget.classList.remove('opacity-50'); // Remove feedback do item arrastado
    setDraggedItem(null);
  };
  // --- End Drag and Drop Handlers ---

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold">Lista de Peças</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="mb-4">
          <Label htmlFor="list-title">Título da Lista (para PDF/Cópia)</Label>
          <Input
            id="list-title"
            type="text"
            value={listTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Ex: Peças para Manutenção de Frota X"
            className="w-full"
          />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
            <Button 
              onClick={handleCopyList} 
              disabled={orderedItems.length === 0} 
              size="icon"
              className="sm:w-auto sm:px-4"
            >
              <Copy className="h-4 w-4" /> 
              <span className="hidden sm:inline ml-2">Copiar Lista</span>
            </Button>
            <Button 
              onClick={handleShareOnWhatsApp} 
              disabled={orderedItems.length === 0} 
              variant="ghost" 
              className="h-10 w-10 p-0 rounded-full" 
              aria-label="Compartilhar no WhatsApp" 
            >
              <img src="/icons/whatsapp.png" alt="WhatsApp Icon" className="h-10 w-10" />
            </Button>
            <Button onClick={handleExportPdf} disabled={orderedItems.length === 0} className="flex items-center gap-2">
              <Download className="h-4 w-4" /> Exportar PDF
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  disabled={orderedItems.length === 0} 
                  size="icon"
                  className="sm:w-auto sm:px-4"
                >
                  <Trash2 className="h-4 w-4" /> 
                  <span className="hidden sm:inline ml-2">Limpar Lista</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá remover todos os itens da sua lista de peças simples. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearList}>Limpar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
      <CardContent>
        {orderedItems.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum item na lista. Adicione peças para começar!</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px] p-2"></TableHead> {/* Coluna para o handle de drag */}
                  <TableHead className="w-auto whitespace-normal break-words p-2">Peça (Cód. / Descrição / AF)</TableHead>
                  <TableHead className="w-[4rem] p-2">Qtd</TableHead>
                  <TableHead className="w-[40px] p-2 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderedItems.map((item) => (
                  <TableRow 
                    key={item.id}
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, item)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, item)}
                    onDragLeave={handleDragLeave}
                    onDragEnd={handleDragEnd}
                    data-id={item.id} // Adiciona data-id para identificar o alvo do drop
                    className="relative" // Necessário para o feedback visual do dragover
                  >
                    <TableCell className="w-[40px] p-2 cursor-grab">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="w-auto whitespace-normal break-words p-2">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{item.codigo_peca || 'N/A'}</span>
                        <span className="text-xs text-muted-foreground">{item.descricao || 'N/A'}</span>
                        {item.af && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 mt-1">AF: {item.af}</span>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="w-[4rem] p-2 text-center font-medium">{item.quantidade ?? 'N/A'}</TableCell>
                    
                    <TableCell className="w-[40px] p-2 text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Remover item</TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PartsListDisplay;