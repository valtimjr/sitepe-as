import React, { useCallback, useState } from 'react';
import { ImageIcon, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ListCover as ListCoverData } from '@/types/listCover';
import { FALLBACK_COVER_BG } from '@/lib/coverPresets';
import CoverPicker from './CoverPicker';
import CoverRepositioner from './CoverRepositioner';
import type { CoverUploadMode } from './tabs/UploadTab';
import { useCoverSrc } from './useCoverSrc';

interface ListCoverProps {
  cover: ListCoverData;
  /** Sem `onChange`, a capa é só para ver. */
  onChange?: (cover: ListCoverData | null) => void;
  uploadMode?: CoverUploadMode;
  /** "mobile" vai de ponta a ponta e é mais baixa. */
  variant?: 'desktop' | 'mobile';
  className?: string;
}

const actionClass = 'h-8 rounded-none border-border/60 bg-background/80 px-2.5 text-xs backdrop-blur hover:bg-background';

/** Capa no estilo do Notion: cor, gradiente ou imagem, com trocar e reposicionar. */
const ListCover: React.FC<ListCoverProps> = ({ cover, onChange, uploadMode = 'local', variant = 'desktop', className }) => {
  const src = useCoverSrc(cover);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [repositioning, setRepositioning] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const isImage = cover.kind === 'image';
  const posX = cover.posX ?? 50;
  const posY = cover.posY ?? 50;
  const imageFailed = isImage && failed === src;
  const editable = !!onChange;

  const stopRepositioning = useCallback(() => setRepositioning(false), []);

  const background = !isImage ? cover.value : imageFailed || !src ? FALLBACK_COVER_BG : undefined;

  return (
    <div
      className={cn(
        'group/cover relative w-full overflow-hidden rounded-none bg-muted',
        variant === 'mobile' ? 'h-[clamp(120px,20vh,170px)]' : 'h-[clamp(180px,26vh,260px)]',
        className,
      )}
      style={background ? { background } : undefined}
      data-testid="list-cover"
      data-cover-kind={cover.kind}
      data-cover-source={cover.source}
    >
      {isImage && src && !imageFailed && !repositioning && (
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          draggable={false}
          className="h-full w-full select-none object-cover"
          style={{ objectPosition: `${posX}% ${posY}%` }}
          onError={() => setFailed(src)}
          data-testid="list-cover-image"
        />
      )}

      {repositioning && src ? (
        <CoverRepositioner
          src={src}
          posX={posX}
          posY={posY}
          onCancel={stopRepositioning}
          onSave={(x, y) => {
            onChange?.({ ...cover, posX: x, posY: y });
            setRepositioning(false);
          }}
        />
      ) : (
        <>
          {/* Sombra na base para o ícone sobreposto continuar legível */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent" />

          {cover.credit && (
            <a
              href={cover.credit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-1.5 right-2 bg-black/40 px-1.5 py-0.5 text-[10px] text-white/90 hover:text-white"
              data-testid="list-cover-credit"
            >
              Foto: {cover.credit.name} / Pexels
            </a>
          )}

          {editable && (
            <div
              className={cn(
                'absolute right-2 top-2 flex gap-1.5 transition-opacity',
                variant === 'desktop' && !pickerOpen && 'opacity-0 group-hover/cover:opacity-100 focus-within:opacity-100',
              )}
            >
              <CoverPicker
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                cover={cover}
                onChange={(next) => onChange!(next)}
                uploadMode={uploadMode}
              >
                <Button variant="outline" size="sm" className={actionClass} data-testid="cover-change-button">
                  <ImageIcon className="mr-1.5 h-3.5 w-3.5" /> Alterar
                </Button>
              </CoverPicker>
              {isImage && src && !imageFailed && (
                <Button
                  variant="outline"
                  size="sm"
                  className={actionClass}
                  onClick={() => setRepositioning(true)}
                  data-testid="cover-reposition-button"
                >
                  <Move className="mr-1.5 h-3.5 w-3.5" /> Reposicionar
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ListCover;
