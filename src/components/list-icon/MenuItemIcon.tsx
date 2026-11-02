import React from 'react';
import type { MenuItem } from '@/types/supabase';
import ListIcon, { type ListIconSize } from './ListIcon';

interface MenuItemIconProps {
  item: Pick<MenuItem, 'title' | 'icon' | 'list_icon' | 'list_title' | 'list_id'>;
  size?: ListIconSize;
  className?: string;
}

/** Ícone de um item de menu: ícone da lista vinculada → ícone próprio → automático pelo título. */
const MenuItemIcon: React.FC<MenuItemIconProps> = ({ item, size = 'xs', className }) => {
  const icon = (item.list_id ? item.list_icon : null) ?? item.icon ?? null;
  return <ListIcon name={item.title} icon={icon} size={size} className={className ?? 'rounded'} />;
};

export default MenuItemIcon;
