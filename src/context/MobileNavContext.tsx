import React, { createContext, useContext, useMemo, useRef, useState } from 'react';

interface MobileNavContextValue {
  isMoreOpen: boolean;
  setMoreOpen: (open: boolean) => void;
  isSearchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  /** Handler opcional do "Mais" para o botão voltar; retorna true se tratou o evento. */
  moreBackHandlerRef: React.MutableRefObject<(() => boolean) | null>;
}

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

/** Estado compartilhado do menu "Mais" e da busca em tela cheia (header, barra inferior, botão voltar). */
export const MobileNavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMoreOpen, setMoreOpen] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const moreBackHandlerRef = useRef<(() => boolean) | null>(null);
  const value = useMemo(
    () => ({ isMoreOpen, setMoreOpen, isSearchOpen, setSearchOpen, moreBackHandlerRef }),
    [isMoreOpen, isSearchOpen],
  );
  return <MobileNavContext.Provider value={value}>{children}</MobileNavContext.Provider>;
};

export const useMobileNav = () => {
  const ctx = useContext(MobileNavContext);
  if (!ctx) throw new Error('useMobileNav deve ser usado dentro de MobileNavProvider');
  return ctx;
};
