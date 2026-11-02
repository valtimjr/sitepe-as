import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { tap } from '@/lib/haptics';

interface HomeMenuRowProps {
  to: string;
  external?: boolean;
  /** Imagem em /icons/tela_inicial/. Sem ela, usa o ícone. */
  img?: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  onPointerDown?: () => void;
}

const rowClass =
  'group relative flex items-center gap-3 rounded-none border bg-card px-3 py-2.5 text-card-foreground shadow-sm transition-colors active:bg-muted';

/** Item do menu do Início no mobile: imagem pequena, título e seta. */
const HomeMenuRow: React.FC<HomeMenuRowProps> = ({ to, external, img, icon: Icon, title, subtitle, onPointerDown }) => {
  const [imgFailed, setImgFailed] = useState(false);

  const content = (
    <>
      <span className="absolute inset-y-0 left-0 w-1 bg-primary opacity-0 transition-opacity group-active:opacity-100" />
      <span className="flex h-12 w-12 shrink-0 items-center justify-center">
        {!img || imgFailed ? (
          <Icon className="h-6 w-6 text-primary" />
        ) : (
          <img
            src={`/icons/tela_inicial/${img}`}
            alt=""
            className="h-12 w-12 object-contain"
            onError={() => setImgFailed(true)}
          />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold">{title}</span>
        {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </>
  );

  if (external) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" className={rowClass} onClick={tap} onPointerDown={onPointerDown} data-testid="home-menu-row">
        {content}
      </a>
    );
  }
  return (
    <Link to={to} className={rowClass} onClick={tap} onPointerDown={onPointerDown} data-testid="home-menu-row">
      {content}
    </Link>
  );
};

export default HomeMenuRow;
