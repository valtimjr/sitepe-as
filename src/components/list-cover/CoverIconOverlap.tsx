import React, { useEffect, useRef } from 'react';
import ListIcon from '@/components/list-icon/ListIcon';
import type { ListIcon as ListIconData } from '@/types/listIcon';

interface CoverIconOverlapProps {
  name: string;
  icon?: ListIconData | null;
  /** Avisa se o ícone grande está visível (o cabeçalho fixo esconde o pequeno enquanto isso). */
  onVisibleChange?: (visible: boolean) => void;
}

/** Ícone grande sobreposto à borda de baixo da capa (celular). */
const CoverIconOverlap: React.FC<CoverIconOverlapProps> = ({ name, icon, onVisibleChange }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !onVisibleChange || typeof IntersectionObserver === 'undefined') return;
    // Desconta o header do app e o cabeçalho fixo da lista
    const observer = new IntersectionObserver(([entry]) => onVisibleChange(entry.isIntersecting), {
      rootMargin: '-160px 0px 0px 0px',
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      onVisibleChange(false);
    };
  }, [onVisibleChange]);

  return (
    <div ref={ref} className="relative z-10 -mt-8 mb-1 w-fit" data-testid="list-cover-icon">
      <ListIcon name={name} icon={icon} size="lg" elevated />
    </div>
  );
};

export default CoverIconOverlap;
