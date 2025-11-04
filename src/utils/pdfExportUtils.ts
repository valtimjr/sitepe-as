import { SimplePartItem, ServiceOrderItem, Apontamento } from '@/services/partListService';
import { CustomListItem } from '@/types/supabase';

// Função para carregar dinamicamente o módulo pdfGenerator
const loadPdfGenerator = async () => {
  const pdfGenerator = await import('@/lib/pdfGenerator');
  return pdfGenerator;
};

export const lazyGeneratePartsListPdf = async (listItems: SimplePartItem[], title: string = 'Lista de Peças'): Promise<void> => {
  const { generatePartsListPdf } = await loadPdfGenerator();
  generatePartsListPdf(listItems, title);
};

export const lazyGenerateCustomListPdf = async (listItems: CustomListItem[], title: string): Promise<void> => {
  const { generateCustomListPdf } = await loadPdfGenerator();
  generateCustomListPdf(listItems, title);
};

export const lazyGenerateServiceOrderPdf = async (groupedServiceOrders: any[], title: string = 'Ordens de Serviço'): Promise<void> => {
  const { generateServiceOrderPdf } = await loadPdfGenerator();
  generateServiceOrderPdf(groupedServiceOrders, title);
};

export const lazyGenerateTimeTrackingPdf = async (apontamentos: Apontamento[], title: string): Promise<void> => {
  const { generateTimeTrackingPdf } = await loadPdfGenerator();
  generateTimeTrackingPdf(apontamentos, title);
};