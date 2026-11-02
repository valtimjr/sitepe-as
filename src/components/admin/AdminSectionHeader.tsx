import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { tap } from '@/lib/haptics';

interface AdminSectionHeaderProps {
  label: string;
  onBack: () => void;
}

/** Cabeçalho "‹ Voltar   Painel › Seção" no celular (mesmo visual do MobileListBrowser). */
const AdminSectionHeader: React.FC<AdminSectionHeaderProps> = ({ label, onBack }) => (
  <div className="flex items-center gap-2 border-b bg-background px-2 py-2">
    <button
      type="button"
      onClick={() => {
        tap();
        onBack();
      }}
      className="flex shrink-0 items-center gap-0.5 px-2 py-1.5 text-sm font-semibold text-primary active:bg-primary/10"
      data-testid="admin-section-back"
    >
      <ChevronLeft className="h-4 w-4" />
      Voltar
    </button>
    <nav className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-hidden text-xs text-muted-foreground" aria-label="Caminho">
      <span className="shrink-0">Painel</span>
      <ChevronRight className="h-3 w-3 shrink-0" />
      <span className="truncate font-semibold text-foreground">{label}</span>
    </nav>
  </div>
);

export default AdminSectionHeader;
