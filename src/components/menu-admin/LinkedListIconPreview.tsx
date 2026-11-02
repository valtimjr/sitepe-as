import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ListIcon from '@/components/list-icon/ListIcon';
import type { ListIcon as ListIconData } from '@/types/listIcon';

interface LinkedListIconPreviewProps {
  listTitle: string;
  icon: ListIconData | null;
  onEditList: () => void;
}

/** Ícone de um item ligado a uma lista: só leitura, editado na própria lista. */
const LinkedListIconPreview: React.FC<LinkedListIconPreviewProps> = ({ listTitle, icon, onEditList }) => (
  <div
    className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:flex-row sm:items-center"
    data-testid="linked-list-icon"
  >
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <ListIcon name={listTitle} icon={icon} size="md" className="h-11 w-11 rounded-md border border-border" />
      <p className="min-w-0 break-words text-sm text-muted-foreground" data-testid="menu-icon-list-note">
        Este ícone vem da lista <span className="font-semibold text-foreground">"{listTitle}"</span>.
      </p>
    </div>
    <Button type="button" variant="outline" className="h-11 w-full gap-2 sm:h-9 sm:w-auto" onClick={onEditList} data-testid="edit-in-list">
      <ExternalLink className="h-4 w-4" />
      Editar na lista
    </Button>
  </div>
);

export default LinkedListIconPreview;
