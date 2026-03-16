"use client";

import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  User, 
  Users, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { useSession } from './SessionContextProvider';

const Sidebar = () => {
  const [collapsed, setCollapsed] = React.useState(false);
  const { isAdmin, signOut } = useSession();

  const navItems = [
    { name: 'Início', path: '/', icon: Home },
    { name: 'Perfil', path: '/profile', icon: User },
  ];

  if (isAdmin) {
    navItems.push({ name: 'Usuários', path: '/admin/users', icon: Users });
  }

  return (
    <aside className={cn(
      "bg-card border-r transition-all duration-300 flex flex-col",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="p-4 border-b flex items-center justify-between">
        {!collapsed && <span className="font-bold text-primary flex items-center gap-2"><Package className="h-5 w-5" /> AlmoxApp</span>}
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </Button>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
              isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground",
              collapsed && "justify-center px-0"
            )}
            title={collapsed ? item.name : undefined}
          >
            <item.icon size={20} />
            {!collapsed && <span>{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t">
        <Button 
          variant="ghost" 
          className={cn("w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50", collapsed && "justify-center p-0")} 
          onClick={() => signOut()}
        >
          <LogOut size={20} />
          {!collapsed && <span>Sair</span>}
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;