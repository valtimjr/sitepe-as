import { useEffect, useState } from 'react';

/** Detecta o teclado virtual aberto pela redução da área visível (visualViewport). */
export const useKeyboardOpen = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => setOpen(vv.height < window.innerHeight * 0.75);
    vv.addEventListener('resize', onResize);
    onResize();
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  return open;
};
