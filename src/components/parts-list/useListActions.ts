import { useCompany } from '@/context/CompanyContext';
import { exportDataAsCsv, exportDataAsJson, type SimplePartItem } from '@/services/partListService';
import { lazyGeneratePartsListPdf } from '@/utils/pdfExportUtils';
import { buildListJson, exportListAsXlsx, listItemsForExport, safeFileName } from '@/lib/listFileIO';
import { showError, showSuccess } from '@/utils/toast';
import type { ListIcon } from '@/types/listIcon';

/** Texto da lista para copiar ou enviar: "2 - CÓDIGO DESCRIÇÃO (AF: 123)". */
export const formatItemsText = (title: string, companyName: string, items: SimplePartItem[]) => {
  if (items.length === 0) return '';
  const lines = items.map((item) => {
    const af = item.af ? ` (AF: ${item.af})` : '';
    return `${item.quantidade ?? 1} - ${item.codigo_peca || ''} ${item.descricao || ''}${af}`.trim();
  });
  return `${title} (${companyName})\n\n${lines.join('\n')}`.trim();
};

export type ExportFormat = 'xlsx' | 'csv' | 'json';

interface ListActionsOptions {
  items: SimplePartItem[];
  title: string;
  icon?: ListIcon | null;
}

/** Copiar, WhatsApp, PDF, compartilhamento nativo e exportação de arquivos da lista. */
export const useListActions = ({ items, title, icon }: ListActionsOptions) => {
  const { company, branding } = useCompany();
  const isEmpty = items.length === 0;
  const listTitle = title || 'Lista de Peças';
  const text = () => formatItemsText(listTitle, branding.name, items);

  const copy = async () => {
    if (isEmpty) {
      showError('A lista está vazia. Adicione itens antes de copiar.');
      return;
    }
    try {
      await navigator.clipboard.writeText(text());
      showSuccess('Lista de peças copiada para a área de transferência!');
    } catch {
      showError('Falha ao copiar a lista.');
    }
  };

  const whatsApp = () => {
    if (isEmpty) {
      showError('A lista está vazia. Adicione itens antes de compartilhar.');
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text())}`, '_blank');
    showSuccess('Lista de peças pronta para compartilhar no WhatsApp!');
  };

  const pdf = async () => {
    if (isEmpty) {
      showError('A lista está vazia. Adicione itens antes de exportar.');
      return;
    }
    try {
      await lazyGeneratePartsListPdf(items, {
        title: listTitle,
        listIcon: icon,
        companyName: branding.name,
        logoUrl: branding.logo,
      });
      showSuccess('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      showError('Erro ao gerar o PDF.');
    }
  };

  const exportFile = async (format: ExportFormat) => {
    if (isEmpty) return;
    const baseName = safeFileName(listTitle);
    try {
      if (format === 'json') exportDataAsJson(buildListJson(listTitle, items, company, icon ?? undefined), `${baseName}.json`);
      else if (format === 'csv') exportDataAsCsv(listItemsForExport(items), `${baseName}.csv`);
      else await exportListAsXlsx(items, `${baseName}.xlsx`);
      showSuccess('Lista exportada com sucesso!');
    } catch {
      showError('Erro ao exportar a lista.');
    }
  };

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const nativeShare = canNativeShare
    ? async () => {
        if (isEmpty) return;
        try {
          await navigator.share({ title: listTitle, text: text() });
        } catch {
          // Usuário cancelou o compartilhamento
        }
      }
    : undefined;

  return { isEmpty, copy, whatsApp, pdf, exportFile, nativeShare };
};
