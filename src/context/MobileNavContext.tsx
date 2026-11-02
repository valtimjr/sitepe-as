import React, { createContext, useContext, useMemo, useState } from 'react';

interface MobileNavContextValue {
  isMoreOpen: boolean;
  setMoreOpen: (open: boolean) => void;
  isSearchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
}

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

/** Estado compartilhado do menu "Mais" e da busca em tela cheia (header, barra inferior, botão voltar). */
export const MobileNavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMoreOpen, setMoreOpen] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const value = useMemo(
    () => ({ isMoreOpen, setMoreOpen, isSearchOpen, setSearchOpen }),
    [isMoreOpen, isSearchOpen],
  );
  return <MobileNavContext.Provider value={value}>{children}</MobileNavContext.Provider>;
};

export const useMobileNav = () => {
  const ctx = useContext(MobileNavContext);
  if (!ctx) throw new Error('useMobileNav deve ser usado dentro de MobileNavProvider');
  return ctx;
};
