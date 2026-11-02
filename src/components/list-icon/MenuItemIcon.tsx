import React from 'react';
import type { MenuItem } from '@/types/supabase';
import ListIcon, { type ListIconSize } from './ListIcon';

interface MenuItemIconProps {
  item: Pick<MenuItem, 'title' | 'icon' | 'list_icon' | 'list_title' | 'list_id' | 'isDynamic'>;
  size?: ListIconSize;
  className?: string;
}

/**
 * Ícone de um item de menu:
 * - subtítulo da lista: ícone próprio → ícone da lista → automático;
 * - item ligado a uma lista: ícone da lista → automático;
 * - pasta: ícone próprio → automático.
 */
export const resolveMenuItemIcon = (item: MenuItemIconProps['item']) => {
  if (item.isDynamic) return item.icon ?? item.list_icon ?? null;
  if (item.list_id) return item.list_icon ?? null;
  return item.icon ?? null;
};

const MenuItemIcon: React.FC<MenuItemIconProps> = ({ item, size = 'xs', className }) => {
  const name = item.isDynamic ? item.list_title ?? item.title : item.title;
  return <ListIcon name={name} icon={resolveMenuItemIcon(item)} size={size} className={className ?? 'rounded'} />;
};

export default MenuItemIcon;
