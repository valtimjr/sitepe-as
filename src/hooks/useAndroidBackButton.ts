import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useMobileNav } from '@/context/MobileNavContext';
import { useCompany } from '@/context/CompanyContext';

/** Botão voltar do Android (Capacitor): fecha busca/"Mais", volta uma página ou minimiza na home. */
export const useAndroidBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { company } = useCompany();
  const nav = useMobileNav();

  const stateRef = useRef({ nav, pathname: location.pathname, company });
  stateRef.current = { nav, pathname: location.pathname, company };

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;

    const listenerPromise = App.addListener('backButton', () => {
      const { nav: current, pathname, company: currentCompany } = stateRef.current;
      if (current.isSearchOpen) {
        current.setSearchOpen(false);
        return;
      }
      if (current.isMoreOpen) {
        if (current.moreBackHandlerRef.current?.()) return;
        current.setMoreOpen(false);
        return;
      }
      const isHome = pathname.replace(/\/+$/, '') === `/${currentCompany}`;
      if (isHome || window.history.length <= 1) {
        App.minimizeApp();
        return;
      }
      navigate(-1);
    });

    return () => {
      listenerPromise.then(listener => listener.remove());
    };
  }, [navigate]);
};
