import React, { useState, useRef } from 'react';
import { 
  MoreVertical, 
  Pencil, 
  Copy, 
  Clipboard, 
  Trash2, 
  Plus, 
  Package, 
  Truck, 
  Zap, 
  Droplet, 
  Wrench, 
  Archive, 
  ShoppingCart, 
  Calendar,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LocalList, formatListText } from '@/services/localListStorage';
import { CompanyType } from '@/types/company';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

interface ListCarouselProps {
  lists: LocalList[];
  activeListId: string;
  company: CompanyType;
  companyName: string;
  onSelectList: (id: string) => void;
  onCreateList: (name: string) => void;
  onRenameList: (id: string, newName: string) => void;
  onDuplicateList: (id: string) => void;
  onDeleteList: (id: string) => void;
  onReorderLists: (orderedIds: string[]) => void;
}

export const ListCarousel: React.FC<ListCarouselProps> = ({
  lists,
  activeListId,
  company,
  companyName,
  onSelectList,
  onCreateList,
  onRenameList,
  onDuplicateList,
  onDeleteList,
  onReorderLists,
}) => {
  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameListId, setRenameListId] = useState('');
  const [renameListName, setRenameListName] = useState('');

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteListId, setDeleteListId] = useState('');
  const [deleteListName, setDeleteListName] = useState('');

  // Drag and drop states
  const [draggedListId, setDraggedListId] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Helper to get icon based on list name
  const getListIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('caminhão') || lower.includes('caminhao') || lower.includes('truck') || lower.includes('veículo') || lower.includes('veiculo')) {
      return <Truck className="h-5 w-5 text-amber-500" />;
    }
    if (lower.includes('elétrica') || lower.includes('eletrica') || lower.includes('zap') || lower.includes('energia')) {
      return <Zap className="h-5 w-5 text-yellow-500" />;
    }
    if (lower.includes('hidráulica') || lower.includes('hidraulica') || lower.includes('água') || lower.includes('agua') || lower.includes('óleo') || lower.includes('oleo')) {
      return <Droplet className="h-5 w-5 text-blue-500" />;
    }
    if (lower.includes('oficina') || lower.includes('ferramenta') || lower.includes('tool') || lower.includes('manutenção') || lower.includes('manutencao')) {
      return <Wrench className="h-5 w-5 text-orange-500" />;
    }
    if (lower.includes('estoque') || lower.includes('almoxarifado') || lower.includes('box') || lower.includes('armário') || lower.includes('armario')) {
      return <Archive className="h-5 w-5 text-emerald-500" />;
    }
    if (lower.includes('compra') || lower.includes('mercado') || lower.includes('cart') || lower.includes('adquirir')) {
      return <ShoppingCart className="h-5 w-5 text-purple-500" />;
    }
    if (lower.includes('preventiva') || lower.includes('revisão') || lower.includes('revisao') || lower.includes('calendário') || lower.includes('calendario')) {
      return <Calendar className="h-5 w-5 text-rose-500" />;
    }
    return <Package className="h-5 w-5 text-slate-500" />;
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedListId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedListId && draggedListId !== id) {
      const draggedIndex = lists.findIndex(l => l.id === draggedListId);
      const targetIndex = lists.findIndex(l => l.id === id);
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newOrderedIds = lists.map(l => l.id);
        newOrderedIds.splice(draggedIndex, 1);
        newOrderedIds.splice(targetIndex, 0, draggedListId);
        onReorderLists(newOrderedIds);
      }
    }
  };

  const handleDragEnd = () => {
    setDraggedListId(null);
  };

  // Action handlers
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) {
      showError('O nome da lista não pode ser vazio.');
      return;
    }
    onCreateList(newListName);
    setNewListName('');
    setIsCreateOpen(false);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameListName.trim()) {
      showError('O nome da lista não pode ser vazio.');
      return;
    }
    onRenameList(renameListId, renameListName);
    setIsRenameOpen(false);
  };

  const handleCopyListText = async (list: LocalList) => {
    const text = formatListText(list, companyName);
    if (!text) {
      showError('A lista está vazia.');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showSuccess(`Lista "${list.name}" copiada para a área de transferência!`);
    } catch (err) {
      showError('Erro ao copiar lista.');
    }
  };

  const handleDeleteConfirm = () => {
    if (lists.length <= 1) {
      showError('Não é possível excluir a única lista existente.');
      return;
    }
    onDeleteList(deleteListId);
    setIsDeleteOpen(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto mb-6">
      {/* Carousel Container */}
      <div 
        ref={carouselRef}
        className="flex gap-3 overflow-x-auto pb-3 pt-1 px-1 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent snap-x"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {lists.map((list) => {
          const isActive = list.id === activeListId;
          const itemCount = list.items?.length || 0;

          return (
            <div
              key={list.id}
              draggable
              onDragStart={(e) => handleDragStart(e, list.id)}
              onDragOver={(e) => handleDragOver(e, list.id)}
              onDragEnd={handleDragEnd}
              onClick={() => onSelectList(list.id)}
              className={cn(
                "relative flex-shrink-0 w-44 h-24 p-3 flex flex-col justify-between cursor-pointer select-none transition-all duration-200 snap-start",
                "border bg-card text-card-foreground",
                isActive 
                  ? "border-primary ring-2 ring-primary/20 shadow-md scale-[1.02]" 
                  : "border-border hover:border-primary/40 hover:shadow-sm",
                draggedListId === list.id && "opacity-40"
              )}
            >
              {/* Top Row: Icon & Menu */}
              <div className="flex items-center justify-between">
                <div className="p-1.5 rounded-lg bg-muted/60">
                  {getListIcon(list.name)}
                </div>
                
                {/* Three-dot Menu */}
                <div onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted">
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => {
                        setRenameListId(list.id);
                        setRenameListName(list.name);
                        setIsRenameOpen(true);
                      }}>
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>Renomear</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicateList(list.id)}>
                        <Copy className="mr-2 h-4 w-4" />
                        <span>Duplicar Lista</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyListText(list)}>
                        <Clipboard className="mr-2 h-4 w-4" />
                        <span>Copiar Lista</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        disabled={lists.length <= 1}
                        onClick={() => {
                          setDeleteListId(list.id);
                          setDeleteListName(list.name);
                          setIsDeleteOpen(true);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Excluir Lista</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Bottom Row: Name & Item Count */}
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm truncate pr-1">{list.name}</span>
                <span className="text-xs text-muted-foreground">
                  {itemCount} {itemCount === 1 ? 'peça' : 'peças'}
                </span>
              </div>

              {/* Active Indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-t-full" />
              )}
            </div>
          );
        })}

        {/* Add New List Card */}
        <div
          onClick={() => setIsCreateOpen(true)}
          className={cn(
            "flex-shrink-0 w-44 h-24 p-3 flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-200 snap-start",
            "border border-dashed border-muted-foreground/30 bg-muted/20 hover:bg-muted/40 hover:border-primary/40"
          )}
        >
          <div className="p-2 rounded-full bg-primary/10 text-primary mb-1">
            <Plus className="h-5 w-5" />
          </div>
          <span className="font-semibold text-xs text-primary">Nova Lista</span>
        </div>
      </div>

      {/* Create List Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Nova Lista</DialogTitle>
            <DialogDescription>
              Insira o nome para a sua nova lista de peças.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-list-name">Nome da Lista</Label>
              <Input
                id="new-list-name"
                placeholder="Ex: Caminhão 42032, Preventiva..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter className="flex gap-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Criar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename List Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renomear Lista</DialogTitle>
            <DialogDescription>
              Altere o nome da lista selecionada.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRenameSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rename-list-name">Novo Nome</Label>
              <Input
                id="rename-list-name"
                value={renameListName}
                onChange={(e) => setRenameListName(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter className="flex gap-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setIsRenameOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Excluir Lista</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a lista <strong>"{deleteListName}"</strong>? Esta ação removerá permanentemente todas as peças contidas nela e não poderá ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteConfirm}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
