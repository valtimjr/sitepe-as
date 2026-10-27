import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useIconRegistry } from '@/lib/listIconLoader';
import type { ListIcon, ListIconSource } from '@/types/listIcon';
import IconGrid from './IconGrid';
import EmojiTab from './EmojiTab';
import { SUGGESTED_HERO, SUGGESTED_LUCIDE } from './ListIcon';

type Tab = 'emoji' | 'lucide' | 'heroicons';

interface IconPickerPopoverProps {
  icon?: ListIcon | null;
  onSelect: (source: ListIconSource, value: string) => void;
  children: React.ReactNode;
}

const tabFor = (icon?: ListIcon | null): Tab =>
  icon?.source === 'emoji' ? 'emoji' : icon?.source?.startsWith('heroicons') ? 'heroicons' : 'lucide';

const Loading = () => (
  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
    <Loader2 className="h-5 w-5 animate-spin" />
  </div>
);

const IconPickerPopover: React.FC<IconPickerPopoverProps> = ({ icon, onSelect, children }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(tabFor(icon));
  const [heroStyle, setHeroStyle] = useState<'outline' | 'solid'>(icon?.source === 'heroicons-solid' ? 'solid' : 'outline');
  const registry = useIconRegistry(open);
  const [contentEl, setContentEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setTab(tabFor(icon));
      if (icon?.source === 'heroicons-solid') setHeroStyle('solid');
      else if (icon?.source === 'heroicons-outline') setHeroStyle('outline');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // O popover fica fora do Dialog (portal); impede que o bloqueio de rolagem do Dialog trave a grade e o emoji-mart.
  useEffect(() => {
    if (!contentEl) return;
    const stop = (e: Event) => e.stopPropagation();
    contentEl.addEventListener('wheel', stop);
    contentEl.addEventListener('touchmove', stop);
    return () => {
      contentEl.removeEventListener('wheel', stop);
      contentEl.removeEventListener('touchmove', stop);
    };
  }, [contentEl]);

  const choose = useCallback(
    (source: ListIconSource, value: string) => {
      onSelect(source, value);
      setOpen(false);
    },
    [onSelect]
  );

  const heroSource: ListIconSource = heroStyle === 'solid' ? 'heroicons-solid' : 'heroicons-outline';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        ref={setContentEl}
        className="w-[340px] max-w-[calc(100vw-1rem)] p-2 max-h-[min(420px,calc(100vh-2rem))] flex flex-col overflow-hidden"
        align="center"
        collisionPadding={8}
        data-testid="icon-picker"
      >
        <Tabs value={tab} onValueChange={v => setTab(v as Tab)} className="flex flex-col min-h-0 flex-1">
          <TabsList className="grid grid-cols-3 w-full shrink-0">
            <TabsTrigger value="emoji" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Emoji</TabsTrigger>
            <TabsTrigger value="lucide" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Lucide</TabsTrigger>
            <TabsTrigger value="heroicons" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Heroicons</TabsTrigger>
          </TabsList>

          <TabsContent value="emoji" className="mt-2 min-h-0 overflow-hidden">
            <EmojiTab onSelect={native => choose('emoji', native)} />
          </TabsContent>

          <TabsContent value="lucide" className="mt-2 min-h-0 flex-1 flex flex-col data-[state=inactive]:hidden">
            {registry ? (
              <IconGrid
                names={registry.lucideNames}
                icons={registry.lucide}
                suggestions={SUGGESTED_LUCIDE}
                selected={icon?.source === 'lucide' ? icon.value : undefined}
                onSelect={name => choose('lucide', name)}
                searchIconNames={registry.searchIconNames}
                testIdPrefix="lucide-icon"
              />
            ) : (
              <Loading />
            )}
          </TabsContent>

          <TabsContent value="heroicons" className="mt-2 min-h-0 flex-1 flex flex-col data-[state=inactive]:hidden">
            {registry ? (
              <IconGrid
                names={registry.heroNames}
                icons={heroStyle === 'solid' ? registry.heroSolid : registry.heroOutline}
                suggestions={SUGGESTED_HERO}
                selected={icon?.source === heroSource ? icon.value : undefined}
                onSelect={name => choose(heroSource, name)}
                searchIconNames={registry.searchIconNames}
                stripSuffix="Icon"
                testIdPrefix="hero-icon"
                header={
                  <ToggleGroup
                    type="single"
                    size="sm"
                    value={heroStyle}
                    onValueChange={v => v && setHeroStyle(v as 'outline' | 'solid')}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="outline" className="text-xs h-7">Outline</ToggleGroupItem>
                    <ToggleGroupItem value="solid" className="text-xs h-7">Solid</ToggleGroupItem>
                  </ToggleGroup>
                }
              />
            ) : (
              <Loading />
            )}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};

export default IconPickerPopover;
