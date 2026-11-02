import { SimplePartItem, ServiceOrderItem, Apontamento } from '@/services/partListService';
import { CustomListItem } from '@/types/supabase';
import type { ListPdfOptions } from '@/lib/pdfGenerator';

// Função para carregar dinamicamente o módulo pdfGenerator
const loadPdfGenerator = async () => {
  const pdfGenerator = await import('@/lib/pdfGenerator');
  return pdfGenerator;
};

export const lazyGeneratePartsListPdf = async (listItems: SimplePartItem[], opts: ListPdfOptions): Promise<void> => {
  const { generatePartsListPdf } = await loadPdfGenerator();
  await generatePartsListPdf(listItems, opts);
};

export const lazyGenerateCustomListPdf = async (listItems: CustomListItem[], opts: ListPdfOptions): Promise<void> => {
  const { generateCustomListPdf } = await loadPdfGenerator();
  await generateCustomListPdf(listItems, opts);
};

export const lazyGenerateServiceOrderPdf = async (groupedServiceOrders: any[], title: string = 'Ordens de Serviço'): Promise<void> => {
  const { generateServiceOrderPdf } = await loadPdfGenerator();
  generateServiceOrderPdf(groupedServiceOrders, title);
};

export const lazyGenerateTimeTrackingPdf = async (apontamentos: Apontamento[], title: string): Promise<void> => {
  const { generateTimeTrackingPdf } = await loadPdfGenerator();
  generateTimeTrackingPdf(apontamentos, title);
};
