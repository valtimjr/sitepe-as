import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { 
  MoreVertical, 
  Pencil, 
  Copy, 
  Clipboard, 
  Trash2, 
  Plus, 
  Package, 
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { LocalList } from '@/services/localListStorage';
import { CompanyType } from '@/types/company';
import { cn } from '@/lib/utils';
import type { ListIcon as ListIconData } from '@/types/listIcon';
import ListIcon from '@/components/list-icon/ListIcon';
import ListSaveMenu from '@/components/ListSaveMenu';
import { useListManagement } from '@/components/parts-list/useListManagement';

interface ListCarouselProps {
  lists: LocalList[];
  activeListId: string;
  company: CompanyType;
  companyName: string;
  onSelectList: (id: string) => void;
  onCreateList: (name: string, icon?: ListIconData | null) => void;
  onRenameList: (id: string, newName: string, icon?: ListIconData | null) => void;
  onDuplicateList: (id: string) => void;
  onDeleteList: (id: string) => void;
  onReorderLists: (orderedIds: string[]) => void;
  onListChanged: () => void;
  /** Esconde o menu Salvar/Exportar (no celular ele fica no botão Compartilhar). */
  hideSaveMenu?: boolean;
  className?: string;
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
  onListChanged,
  hideSaveMenu = false,
  className,
}) => {
  const {
    openCreate,
    openRename,
    openDelete,
    copyListText,
    requestCloudAction,
    savingListId,
    dialogs,
  } = useListManagement({ lists, company, companyName, onCreateList, onRenameList, onDeleteList, onListChanged });

  // Container and sizing refs
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  
  const [containerWidth, setContainerWidth] = useState(0);
  const [cardWidth, setCardWidth] = useState(80);

  // Carousel state
  const numLists = lists.length;
  const [virtualIndex, setVirtualIndex] = useState(-1);
  const [isInstantJump, setIsInstantJump] = useState(false);
  const numListsRef = useRef(numLists);
  const ringKeyRef = useRef('');

  // Drag / Touch state (o deslocamento vai direto no DOM para ficar fluido)
  const [isDragging, setIsDragging] = useState(false);
  const gestureRef = useRef<{
    pointerId: number;
    baseIndex: number;
    startX: number;
    startY: number;
    axis: 'x' | 'y' | null;
    dx: number;
    samples: { x: number; t: number }[];
  } | null>(null);
  const justDraggedRef = useRef(false);
  const pressShiftRef = useRef(0);
  const rafRef = useRef(0);

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
    // O contêiner pode mudar de tamanho sem disparar 'resize' (ex.: dentro do cabeçalho fixo)
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateDimensions) : null;
    if (observer && containerRef.current) observer.observe(containerRef.current);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      observer?.disconnect();
    };
  }, []);

  const gap = 12; // 12px gap between cards
  const totalItemStep = cardWidth + gap;

  // Anel infinito: cópias suficientes de cada lado para nunca aparecer o fim,
  // mesmo arrastando uma tela inteira ou dando um impulso longo.
  const isLooping = numLists >= 2;
  const setsPerSide = React.useMemo(() => {
    if (!isLooping) return 0;
    const sideCards = Math.ceil((containerWidth * 1.5) / totalItemStep) + numLists + 2;
    return Math.max(1, Math.ceil(sideCards / numLists));
  }, [isLooping, containerWidth, totalItemStep, numLists]);
  const middleStart = setsPerSide * numLists;
  const ringKey = `${numLists}-${setsPerSide}`;

  const realIndexOf = useCallback(
    (virtual: number) => (numLists ? ((virtual % numLists) + numLists) % numLists : 0),
    [numLists],
  );

  // Sync activeListId to virtualIndex (sem pular se o cartão atual já é a lista ativa)
  useLayoutEffect(() => {
    if (numLists === 0) return;
    const realIndex = lists.findIndex(l => l.id === activeListId);
    const validRealIndex = realIndex >= 0 ? realIndex : 0;
    const ringChanged = numListsRef.current !== numLists || ringKeyRef.current !== ringKey;
    numListsRef.current = numLists;
    ringKeyRef.current = ringKey;

    setVirtualIndex(prev => {
      if (!isLooping) return validRealIndex;
      const total = (setsPerSide * 2 + 1) * numLists;
      if (!ringChanged && prev >= 0 && prev < total && realIndexOf(prev) === validRealIndex) return prev;
      // Position in the middle set of the virtual ring
      return middleStart + validRealIndex;
    });
  }, [activeListId, numLists, lists, ringKey, isLooping, setsPerSide, middleStart, realIndexOf]);

  // Construct extended array for infinite ring buffer
  const extendedLists = React.useMemo(() => {
    if (!isLooping) return lists;
    const copies = setsPerSide * 2 + 1;
    const out: LocalList[] = [];
    for (let c = 0; c < copies; c++) out.push(...lists);
    return out;
  }, [lists, isLooping, setsPerSide]);

  /** Volta para a cópia do meio sem animação (o usuário não percebe: o cartão é igual). */
  const recenter = useCallback((virtual: number) => {
    if (!isLooping) return virtual;
    if (virtual >= middleStart && virtual < middleStart + numLists) return virtual;
    const normalized = middleStart + realIndexOf(virtual);
    setIsInstantJump(true);
    setVirtualIndex(normalized);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsInstantJump(false));
    });
    return normalized;
  }, [isLooping, middleStart, numLists, realIndexOf]);

  // Handle seamless wrapping when transition ends
  const handleTransitionEnd = useCallback((e: React.TransitionEvent) => {
    // Ignora as transições dos cartões (elas também sobem até aqui)
    if (e.target !== e.currentTarget || e.propertyName !== 'transform') return;
    recenter(virtualIndex);
  }, [virtualIndex, recenter]);

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

  // Geometry calculations for exact centering
  const translateFor = (index: number) =>
    containerWidth > 0 ? (containerWidth / 2) - (cardWidth / 2) - (index * totalItemStep) : 0;

  const SNAP_TRANSITION = 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)';

  const setTrackTransform = (x: number, transition: string) => {
    const track = trackRef.current;
    if (!track) return;
    track.style.transition = transition;
    track.style.transform = `translate3d(${x}px, 0, 0)`;
  };

  // Pointer / Touch gesture handlers: o cartão segue o dedo e, ao soltar, desliza com o impulso
  const handlePointerDown = (e: React.PointerEvent) => {
    if (numLists < 2 || (e.pointerType === 'mouse' && e.button !== 0)) return;
    // Exclude clicks on action buttons / dropdowns
    if ((e.target as HTMLElement).closest('button, [role="menuitem"], [role="dialog"]')) {
      return;
    }
    // Se parou no meio de uma animação fora da cópia do meio, reposiciona antes de arrastar
    const baseIndex = recenter(virtualIndex);
    pressShiftRef.current = baseIndex - virtualIndex;
    if (baseIndex !== virtualIndex) setTrackTransform(translateFor(baseIndex), 'none');
    gestureRef.current = {
      pointerId: e.pointerId,
      baseIndex,
      startX: e.clientX,
      startY: e.clientY,
      axis: null,
      dx: 0,
      samples: [{ x: e.clientX, t: e.timeStamp }],
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const g = gestureRef.current;
    if (!g || g.pointerId !== e.pointerId) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;

    if (!g.axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      g.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (g.axis === 'y') {
        // Rolagem vertical da página: deixa com o navegador
        gestureRef.current = null;
        return;
      }
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setIsDragging(true);
    }

    g.dx = dx;
    g.samples.push({ x: e.clientX, t: e.timeStamp });
    if (g.samples.length > 6) g.samples.shift();

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setTrackTransform(translateFor(g.baseIndex) + g.dx, 'none');
    });
  };

  const endGesture = (e: React.PointerEvent, cancelled: boolean) => {
    const g = gestureRef.current;
    if (!g || g.pointerId !== e.pointerId) return;
    gestureRef.current = null;
    if (g.axis !== 'x') return;

    cancelAnimationFrame(rafRef.current);
    setIsDragging(false);
    justDraggedRef.current = true;
    setTimeout(() => { justDraggedRef.current = false; }, 0);

    let steps = 0;
    if (!cancelled) {
      // Velocidade (px/ms) nos últimos movimentos projeta até onde o carrossel vai
      const first = g.samples[0];
      const last = g.samples[g.samples.length - 1];
      const dt = Math.max(last.t - first.t, 1);
      const velocity = Math.max(-2.5, Math.min(2.5, (last.x - first.x) / dt));
      const projected = g.dx + velocity * 220;
      steps = Math.round(-projected / totalItemStep);
      if (steps === 0 && Math.abs(velocity) > 0.35) steps = velocity < 0 ? 1 : -1;
      // Nunca dá a volta completa (cairia na mesma lista)
      const maxSteps = Math.max(1, numLists - 1);
      steps = Math.max(-maxSteps, Math.min(maxSteps, steps));
    }

    const target = Math.max(0, Math.min(g.baseIndex + steps, extendedLists.length - 1));
    setTrackTransform(translateFor(target), SNAP_TRANSITION);
    if (target !== g.baseIndex) goToVirtualIndex(target);
  };

  const handlePointerUp = (e: React.PointerEvent) => endGesture(e, false);
  const handlePointerCancel = (e: React.PointerEvent) => endGesture(e, true);

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

  // Center translation: places active card exactly in the middle of container
  const currentTranslateX = translateFor(Math.max(virtualIndex, 0));

  return (
    <div className={cn("w-full max-w-6xl mx-auto mb-6 px-1 select-none", className)}>
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
            onClick={openCreate}
            className="h-7 text-xs font-bold gap-1.5 rounded-none shadow-none bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Nova Lista
          </Button>

          {!hideSaveMenu && (
            <ListSaveMenu
              variant="compact"
              items={lists.find(l => l.id === activeListId)?.items ?? []}
              listTitle={lists.find(l => l.id === activeListId)?.name ?? ''}
              onListChanged={onListChanged}
            />
          )}
        </div>
      </div>

      {/* Infinite Carousel Viewport */}
      <div 
        ref={containerRef}
        role="region"
        aria-label="Navegação de Listas de Peças"
        data-no-ptr
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
            <Button size="sm" onClick={openCreate} className="rounded-none">
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
                : SNAP_TRANSITION,
              willChange: 'transform'
            }}
          >
            {extendedLists.map((list, idx) => {
              const isActive = idx === virtualIndex;
              const itemCount = list.items?.length || 0;

              return (
                <div
                  key={`${list.id}-${idx}`}
                  style={{ width: `${cardWidth}px`, marginRight: `${gap}px` }}
                  onClick={() => {
                    // Se o anel foi reposicionado ao tocar, o cartão equivalente está deslocado
                    const shift = pressShiftRef.current;
                    pressShiftRef.current = 0;
                    if (!justDraggedRef.current) {
                      goToVirtualIndex(idx + shift);
                    }
                  }}
                  data-testid="list-carousel-card"
                  className={cn(
                    "relative shrink-0 aspect-[4/3] p-3.5 flex flex-col justify-between border select-none transition-[border-color,background-color,opacity,transform,box-shadow] duration-200 rounded-none bg-card text-card-foreground",
                    isActive 
                      ? "border-primary/60 bg-primary/5 dark:bg-primary/10 scale-[1.02] shadow-sm z-10" 
                      : "border-border/80 hover:border-border/100 hover:bg-accent/10 opacity-85 hover:opacity-100"
                  )}
                >
                  {/* Top Row: Icon, Title & Options */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <ListIcon name={list.name} icon={list.icon} size="sm" />
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
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-none hover:bg-muted" aria-label="Opções da lista">
                            <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-none border-border">
                          <DropdownMenuItem onClick={() => openRename(list)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            <span>Renomear / Ícone</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={savingListId === list.id}
                            onClick={() => requestCloudAction('save', list.id)}
                          >
                            {savingListId === list.id
                              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              : <CloudUpload className="mr-2 h-4 w-4" />}
                            <span>Salvar na nuvem</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!list.cloudId || savingListId === list.id}
                            onClick={() => requestCloudAction('update', list.id)}
                            title={list.cloudId
                              ? 'Compara a versão local com a da nuvem e mantém a mais nova'
                              : 'Esta lista ainda não foi salva na nuvem'}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            <span>Atualizar na nuvem</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDuplicateList(list.id)}>
                            <Copy className="mr-2 h-4 w-4" />
                            <span>Duplicar Lista</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyListText(list)}>
                            <Clipboard className="mr-2 h-4 w-4" />
                            <span>Copiar Lista</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            disabled={numLists <= 1}
                            onClick={() => openDelete(list)}
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

      {dialogs}
    </div>
  );
};
