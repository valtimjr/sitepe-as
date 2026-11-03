import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

interface CoverRepositionerProps {
  src: string;
  posX: number;
  posY: number;
  onSave: (posX: number, posY: number) => void;
  onCancel: () => void;
}

const clamp = (n: number) => Math.min(100, Math.max(0, n));

/** Arraste (mouse ou toque) para ajustar a object-position da imagem. */
const CoverRepositioner: React.FC<CoverRepositionerProps> = ({ src, posX, posY, onSave, onCancel }) => {
  const [pos, setPos] = useState({ x: posX, y: posY });
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; x: number; y: number; overX: number; overY: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const handlePointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    e.preventDefault();
    img.setPointerCapture(e.pointerId);
    const cw = img.clientWidth;
    const ch = img.clientHeight;
    // Quanto a imagem "sobra" além da área visível em cada eixo (object-fit: cover)
    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      x: pos.x,
      y: pos.y,
      overX: img.naturalWidth * scale - cw,
      overY: img.naturalHeight * scale - ch,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    setPos({
      x: d.overX > 0 ? clamp(d.x - (dx / d.overX) * 100) : d.x,
      y: d.overY > 0 ? clamp(d.y - (dy / d.overY) * 100) : d.y,
    });
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  return (
    <div className="absolute inset-0" data-testid="cover-repositioner">
      <img
        ref={imgRef}
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        draggable={false}
        className="h-full w-full select-none object-cover cursor-grab active:cursor-grabbing touch-none"
        style={{ objectPosition: `${pos.x}% ${pos.y}%` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        data-testid="cover-reposition-image"
      />
      <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
        <span className="bg-background/80 px-3 py-1.5 text-xs font-medium backdrop-blur">
          Arraste a imagem para reposicionar
        </span>
      </div>
      <div className="absolute right-2 top-2 flex gap-1.5">
        <Button
          size="sm"
          className="h-8 rounded-none"
          onClick={() => onSave(Math.round(pos.x), Math.round(pos.y))}
          data-testid="cover-reposition-save"
        >
          Salvar posição
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 rounded-none bg-background/80 backdrop-blur"
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
};

export default CoverRepositioner;
