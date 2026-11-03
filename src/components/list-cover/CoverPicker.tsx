import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from '@/components/responsive/ResponsivePopover';
import type { ListCover } from '@/types/listCover';
import GalleryTab from './tabs/GalleryTab';
import UploadTab, { type CoverUploadMode } from './tabs/UploadTab';
import LinkTab from './tabs/LinkTab';
import PexelsTab from './tabs/PexelsTab';

interface CoverPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cover?: ListCover | null;
  onChange: (cover: ListCover | null) => void;
  uploadMode: CoverUploadMode;
  /** Botão que abre o seletor. Sem ele, o seletor é aberto só pelo `open`. */
  children?: React.ReactNode;
}

const tabClass = 'rounded-none text-xs sm:text-sm data-[state=active]:shadow-none';

/** Popover no desktop e gaveta no celular com Galeria · Upload · Link · Pexels. */
const CoverPicker: React.FC<CoverPickerProps> = ({ open, onOpenChange, cover, onChange, uploadMode, children }) => {
  const select = (next: ListCover | null) => {
    onChange(next);
    onOpenChange(false);
  };

  return (
    <ResponsivePopover open={open} onOpenChange={onOpenChange}>
      {children && <ResponsivePopoverTrigger>{children}</ResponsivePopoverTrigger>}
      <ResponsivePopoverContent
        title="Capa da lista"
        align="end"
        className="rounded-none"
        popoverClassName="w-[520px] max-w-[calc(100vw-2rem)] p-3"
        data-testid="cover-picker"
      >
        <Tabs defaultValue="gallery">
          <div className="mb-3 flex items-center gap-2">
            <TabsList className="h-9 flex-1 justify-start rounded-none p-0.5">
              <TabsTrigger value="gallery" className={tabClass}>Galeria</TabsTrigger>
              <TabsTrigger value="upload" className={tabClass}>Upload</TabsTrigger>
              <TabsTrigger value="link" className={tabClass}>Link</TabsTrigger>
              <TabsTrigger value="pexels" className={tabClass}>Pexels</TabsTrigger>
            </TabsList>
            {cover && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 shrink-0 rounded-none px-2 text-destructive hover:text-destructive"
                onClick={() => select(null)}
                data-testid="cover-remove"
              >
                <Trash2 className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Remover</span>
              </Button>
            )}
          </div>
          {/* No desktop, cabe no espaço livre da tela (o popover não passa da borda) */}
          <div className="max-h-[55vh] overflow-y-auto overscroll-contain pr-0.5 lg:max-h-[min(420px,calc(var(--radix-popover-content-available-height)_-_80px))]">
            <TabsContent value="gallery" className="mt-0">
              <GalleryTab current={cover} onSelect={select} />
            </TabsContent>
            <TabsContent value="upload" className="mt-0">
              <UploadTab mode={uploadMode} onSelect={select} />
            </TabsContent>
            <TabsContent value="link" className="mt-0">
              <LinkTab onSelect={select} />
            </TabsContent>
            <TabsContent value="pexels" className="mt-0">
              <PexelsTab onSelect={select} />
            </TabsContent>
          </div>
        </Tabs>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
};

export default CoverPicker;
