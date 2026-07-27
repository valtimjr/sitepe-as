import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ChevronLeft,
  ChevronRight
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

  // Container and sizing refs
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  
  const [containerWidth, setContainerWidth] = useState(0);
  const [cardWidth, setCardWidth] = useState(80);

  // Carousel state
  const numLists = lists.length;
  const [virtualIndex, setVirtualIndex] = useState(0);
  const [isInstantJump, setIsInstantJump] = useState(false);
  
  // Drag / Touch state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const startXRef = useRef(0);
  const currentDragOffsetRef = useRef(0);
  const isPointerDownRef = useRef(false);

  // Wheel debounce
  const lastWheelTimeRef = useRef(0);

  // Helper to format date
  const formatLastUpdated = (isoString?: string) => {
    if (!isoString) return 'Recentemente';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Recentemente';
    
    const now = new Date();
    const isToday = date.getDate() === now.getDate() &&
                    date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear();
                    
    const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    if (isToday) {
      return `Hoje, ${timeStr}`;
    }
    
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  // Helper to get icon based on list name
  const getListIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('caminhão') || lower.includes('caminhao') || lower.includes('truck') || lower.includes('veículo') || lower.includes('veiculo')) {
      return <Truck className="h-4 w-4 text-amber-500" />;
    }
    if (lower.includes('elétrica') || lower.includes('eletrica') || lower.includes('zap') || lower.includes('energia')) {
      return <Zap className="h-4 w-4 text-yellow-500" />;
    }
    if (lower.includes('hidráulica') || lower.includes('hidraulica') || lower.includes('água') || lower.includes('agua') || lower.includes('óleo') || lower.includes('oleo')) {
      return <Droplet className="h-4 w-4 text-blue-500" />;
    }
    if (lower.includes('oficina') || lower.includes('ferramenta') || lower.includes('tool') || lower.includes('manutenção') || lower.includes('manutencao')) {
      return <Wrench className="h-4 w-4 text-orange-500" />;
    }
    if (lower.includes('estoque') || lower.includes('almoxarifado') || lower.includes('box') || lower.includes('armário') || lower.includes('armario')) {
      return <Archive className="h-4 w-4 text-emerald-500" />;
    }
    if (lower.includes('compra') || lower.includes('mercado') || lower.includes('cart') || lower.includes('adquirir')) {
      return <ShoppingCart className="h-4 w-4 text-purple-500" />;
    }
    if (lower.includes('preventiva') || lower.includes('revisão') || lower.includes('revisao') || lower.includes('calendário') || lower.includes('calendario')) {
      return <Calendar className="h-4 w-4 text-rose-500" />;
    }
    return <Package className="h-4 w-4 text-slate-500" />;
  };

  // Measure container and card widths
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const cWidth = containerRef.current.clientWidth;
        setContainerWidth(cWidth);
        // Card takes ~78% of mobile screen width or max 280px
        const calculatedCardWidth = Math.min(Math.max(cWidth * 0.6, 120), 180);
        setCardWidth(calculatedCardWidth);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Sync activeListId to virtualIndex
  useEffect(() => {
    if (numLists === 0) return;
    const realIndex = lists.findIndex(l => l.id === activeListId);
    const validRealIndex = realIndex >= 0 ? realIndex : 0;

    if (numLists >= 2) {
      // Position in the middle set of the 3x virtual ring buffer
      setVirtualIndex(numLists + validRealIndex);
    } else {
      setVirtualIndex(validRealIndex);
    }
  }, [activeListId, numLists, lists]);

  // Construct extended array for infinite ring buffer
  const extendedLists = React.useMemo(() => {
    if (numLists >= 2) {
      return [...lists, ...lists, ...lists];
    }
    return lists;
  }, [lists, numLists]);

  // Handle seamless wrapping when transition ends
  const handleTransitionEnd = useCallback(() => {
    if (numLists < 2) return;

    if (virtualIndex < numLists) {
      // User moved left into set 0 -> jump to set 1
      const normalizedReal = ((virtualIndex % numLists) + numLists) % numLists;
      setIsInstantJump(true);
      setVirtualIndex(numLists + normalizedReal);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsInstantJump(false));
      });
    } else if (virtualIndex >= 2 * numLists) {
      // User moved right into set 2 -> jump to set 1
      const normalizedReal = ((virtualIndex % numLists) + numLists) % numLists;
      setIsInstantJump(true);
      setVirtualIndex(numLists + normalizedReal);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsInstantJump(false));
      });
    }
  }, [virtualIndex, numLists]);

  // Navigate to a specific virtual index
  const goToVirtualIndex = useCallback((targetIndex: number) => {
    if (numLists === 0) return;

    const clampedIndex = Math.max(0, Math.min(targetIndex, extendedLists.length - 1));
    setVirtualIndex(clampedIndex);

    // Identify corresponding real item
    const realIdx = ((clampedIndex % numLists) + numLists) % numLists;
    const targetList = lists[realIdx];
    if (targetList && targetList.id !== activeListId) {
      onSelectList(targetList.id);
    }
  }, [extendedLists.length, numLists, lists, activeListId, onSelectList]);

  const handleNext = useCallback(() => {
    goToVirtualIndex(virtualIndex + 1);
  }, [goToVirtualIndex, virtualIndex]);

  const handlePrev = useCallback(() => {
    goToVirtualIndex(virtualIndex - 1);
  }, [goToVirtualIndex, virtualIndex]);

  // Pointer / Touch gesture handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    // Exclude clicks on action buttons / dropdowns
    if ((e.target as HTMLElement).closest('button, [role="menuitem"], [role="dialog"]')) {
      return;
    }
    isPointerDownRef.current = true;
    setIsDragging(true);
    startXRef.current = e.clientX;
    currentDragOffsetRef.current = 0;
    setDragOffset(0);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current) return;
    const deltaX = e.clientX - startXRef.current;
    currentDragOffsetRef.current = deltaX;
    setDragOffset(deltaX);
  };

  const handlePointerUp = () => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    setIsDragging(false);

    const deltaX = currentDragOffsetRef.current;
    setDragOffset(0);

    const threshold = 40; // minimum drag pixels to trigger slide
    if (deltaX < -threshold) {
      handleNext();
    } else if (deltaX > threshold) {
      handlePrev();
    }
  };

  const handlePointerCancel = () => {
    if (isPointerDownRef.current) {
      isPointerDownRef.current = false;
      setIsDragging(false);
      setDragOffset(0);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    }
  };

  // Touchpad horizontal wheel
  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaX !== 0 ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
    if (Math.abs(delta) < 15) return;

    const now = Date.now();
    if (now - lastWheelTimeRef.current < 200) return; // Debounce wheel
    lastWheelTimeRef.current = now;

    if (delta > 0) {
      handleNext();
    } else {
      handlePrev();
    }
  };

  // Dialog actions
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) {
      showError('O nome da lista não pode ser vazio.');
      return;
    }
    onCreateList(newListName.trim());
    setNewListName('');
    setIsCreateOpen(false);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameListName.trim()) {
      showError('O nome da lista não pode ser vazio.');
      return;
    }
    onRenameList(renameListId, renameListName.trim());
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

  // Geometry calculations for exact centering
  const gap = 12; // 12px gap between cards
  const totalItemStep = cardWidth + gap;
  // Center translation: places active card exactly in the middle of container
  const baseTranslateX = containerWidth > 0 
    ? (containerWidth / 2) - (cardWidth / 2) - (virtualIndex * totalItemStep)
    : 0;
  const currentTranslateX = baseTranslateX + dragOffset;

  return (
    <div className="w-full max-w-6xl mx-auto mb-6 px-1 select-none">
      {/* Header bar: Title & Quick Actions */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Suas Listas ({numLists})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {numLists >= 2 && (
            <div className="hidden sm:flex items-center gap-1 mr-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-none border-border/80 hover:bg-accent"
                onClick={handlePrev}
                title="Anterior"
                aria-label="Lista anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-none border-border/80 hover:bg-accent"
                onClick={handleNext}
                title="Próxima"
                aria-label="Próxima lista"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-7 text-xs font-bold gap-1.5 rounded-none shadow-none bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Nova Lista
          </Button>
        </div>
      </div>

      {/* Infinite Carousel Viewport */}
      <div 
        ref={containerRef}
        role="region"
        aria-label="Navegação de Listas de Peças"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="relative w-full overflow-hidden py-2 focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-grab active:cursor-grabbing touch-pan-y"
        style={{ touchAction: 'pan-y' }}
      >
        {numLists === 0 ? (
          <div className="w-full py-8 text-center border border-dashed border-border flex flex-col items-center justify-center gap-3 bg-card">
            <Package className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">Você ainda não tem listas de peças.</p>
            <Button size="sm" onClick={() => setIsCreateOpen(true)} className="rounded-none">
              <Plus className="h-4 w-4 mr-1.5" /> Criar Primeira Lista
            </Button>
          </div>
        ) : (
          <div 
            ref={trackRef}
            onTransitionEnd={handleTransitionEnd}
            className="flex items-center"
            style={{
              width: `${extendedLists.length * totalItemStep}px`,
              transform: `translate3d(${currentTranslateX}px, 0, 0)`,
              transition: (isDragging || isInstantJump) 
                ? 'none' 
                : 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
              willChange: 'transform'
            }}
          >
            {extendedLists.map((list, idx) => {
              const realIndex = ((idx % numLists) + numLists) % numLists;
              const isActive = idx === virtualIndex;
              const itemCount = list.items?.length || 0;

              return (
                <div
                  key={`${list.id}-${idx}`}
                  style={{ width: `${cardWidth}px`, marginRight: `${gap}px` }}
                  onClick={() => {
                    if (!isDragging && Math.abs(currentDragOffsetRef.current) < 5) {
                      goToVirtualIndex(idx);
                    }
                  }}
                  className={cn(
                    "relative shrink-0 h-24 p-3.5 flex flex-col justify-between border select-none transition-all duration-200 rounded-none bg-card text-card-foreground",
                    isActive 
                      ? "border-primary/60 bg-primary/5 dark:bg-primary/10 scale-[1.02] shadow-sm z-10" 
                      : "border-border/80 hover:border-border/100 hover:bg-accent/10 opacity-85 hover:opacity-100"
                  )}
                >
                  {/* Top Row: Icon, Title & Options */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1 bg-muted/80 shrink-0">
                        {getListIcon(list.name)}
                      </div>
                      <span className={cn(
                        "text-sm truncate tracking-tight",
                        isActive ? "font-extrabold text-foreground" : "font-bold text-muted-foreground"
                      )}>
                        {list.name}
                      </span>
                    </div>

                    {/* Options Menu */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-none hover:bg-muted">
                            <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-none border-border">
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
                            disabled={numLists <= 1}
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

                  {/* Bottom Row: Metadata */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium pt-1">
                    <span>{itemCount} {itemCount === 1 ? 'peça' : 'peças'}</span>
                    <span className="truncate max-w-[120px] text-right">{formatLastUpdated(list.updatedAt)}</span>
                  </div>

                  {/* Active Bottom Bar Indicator */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create List Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md rounded-none">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-lg">Criar Nova Lista</DialogTitle>
            <DialogDescription className="text-xs">
              Insira o nome para a sua nova lista de peças.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-list-name" className="text-xs font-bold uppercase">Nome da Lista</Label>
              <Input
                id="new-list-name"
                placeholder="Ex: Caminhão 42032, Preventiva..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="rounded-none text-xs"
                autoFocus
              />
            </div>
            <DialogFooter className="flex gap-2 sm:justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)} className="rounded-none text-xs">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="rounded-none text-xs font-bold">Criar Lista</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename List Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="sm:max-w-md rounded-none">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-lg">Renomear Lista</DialogTitle>
            <DialogDescription className="text-xs">
              Digite o novo nome para esta lista de peças.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRenameSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rename-list-name" className="text-xs font-bold uppercase">Novo Nome</Label>
              <Input
                id="rename-list-name"
                value={renameListName}
                onChange={(e) => setRenameListName(e.target.value)}
                className="rounded-none text-xs"
                autoFocus
              />
            </div>
            <DialogFooter className="flex gap-2 sm:justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsRenameOpen(false)} className="rounded-none text-xs">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="rounded-none text-xs font-bold">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete List Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md rounded-none">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-lg text-destructive">Excluir Lista</DialogTitle>
            <DialogDescription className="text-xs">
              Tem certeza que deseja excluir a lista <strong className="text-foreground">"{deleteListName}"</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsDeleteOpen(false)} className="rounded-none text-xs">
              Cancelar
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={handleDeleteConfirm} className="rounded-none text-xs font-bold">
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
